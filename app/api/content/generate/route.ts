import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { generateContent, generateContentInputSchema } from "@/lib/ai/content";
import { getUserApiKey, aiErrorResponse } from "@/lib/ai/request-key";
import { serializeContent } from "@/lib/content";
import { readJsonBody, jsonBodyErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Parsear el cuerpo.
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    return (
      jsonBodyErrorResponse(err) ??
      NextResponse.json(
        { error: "El cuerpo de la petición no es JSON válido." },
        { status: 400 }
      )
    );
  }

  // 2. Validar la entrada con zod.
  const parsed = generateContentInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos de entrada inválidos.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // 3. API key del usuario (BYOK) ANTES de tocar la BD: así una petición sin
  // credencial no ejecuta consultas.
  let apiKey: string;
  try {
    apiKey = getUserApiKey(request);
  } catch (err) {
    return aiErrorResponse(err);
  }

  // 3b. Si se pasó productId, cargar el producto para dar contexto a la IA.
  let productContext: string | undefined;
  if (input.productId) {
    let product;
    try {
      product = await prisma.product.findUnique({
        where: { id: input.productId },
      });
    } catch (err) {
      console.error(
        "[content/generate] fallo al cargar el producto:",
        err instanceof Error ? err.message : err
      );
      return NextResponse.json(
        { error: "No se pudo validar el producto indicado." },
        { status: 500 }
      );
    }
    if (!product) {
      return NextResponse.json(
        { error: "El producto indicado no existe." },
        { status: 400 }
      );
    }
    productContext = `"${product.title}" (${product.type}${
      product.niche ? `, nicho: ${product.niche}` : ""
    }, precio: ${product.price} ${product.currency})`;
  }

  let pieces;
  try {
    pieces = await generateContent({ ...input, productContext }, apiKey);
  } catch (err) {
    console.error(
      "[content/generate] fallo en generateContent:",
      err instanceof Error ? err.message : err
    );
    return aiErrorResponse(err);
  }

  // 4. Persistir cada pieza como entidad Content.
  try {
    const created = await prisma.$transaction(
      pieces.map((p) =>
        prisma.content.create({
          data: {
            title: input.topic,
            platform: p.platform,
            format: p.format,
            text: p.body,
            hashtags: JSON.stringify(p.hashtags),
            status: "draft",
            productId: input.productId ?? null,
          },
        })
      )
    );

    return NextResponse.json(created.map(serializeContent), { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error desconocido al guardar.";
    console.error("[content/generate] fallo al persistir:", message);
    return NextResponse.json(
      { error: "El contenido se generó pero no se pudo guardar." },
      { status: 500 }
    );
  }
}
