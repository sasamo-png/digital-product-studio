import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { generateContent, generateContentInputSchema } from "@/lib/ai/content";
import { getUserApiKey, aiErrorResponse } from "@/lib/ai/request-key";
import { serializeContent } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Parsear el cuerpo.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición no es JSON válido." },
      { status: 400 }
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

  // 2b. Si se pasó productId, verificar que el producto existe.
  if (input.productId) {
    const exists = await prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json(
        { error: "El producto indicado no existe." },
        { status: 400 }
      );
    }
  }

  // 3. API key del usuario (BYOK) y generación con IA (lado servidor).
  let apiKey: string;
  try {
    apiKey = getUserApiKey(request);
  } catch (err) {
    return aiErrorResponse(err);
  }

  let pieces;
  try {
    pieces = await generateContent(input, apiKey);
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
      { error: `El contenido se generó pero no se pudo guardar: ${message}` },
      { status: 500 }
    );
  }
}
