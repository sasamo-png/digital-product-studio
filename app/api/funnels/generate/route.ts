import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { generateFunnel, generateFunnelInputSchema } from "@/lib/ai/funnel";
import { getUserApiKey, aiErrorResponse } from "@/lib/ai/request-key";
import { serializeFunnel } from "@/lib/funnel";

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
  const parsed = generateFunnelInputSchema.safeParse(body);
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

  // 2b. Cargar el producto (obligatorio) para dar contexto a la IA.
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
  });
  if (!product) {
    return NextResponse.json(
      { error: "El producto indicado no existe." },
      { status: 400 }
    );
  }
  const productContext = `"${product.title}" (${product.type}${
    product.niche ? `, nicho: ${product.niche}` : ""
  }, precio: ${product.price} ${product.currency})`;

  // 3. API key del usuario (BYOK) y generación con IA (lado servidor).
  let apiKey: string;
  try {
    apiKey = getUserApiKey(request);
  } catch (err) {
    return aiErrorResponse(err);
  }

  let result;
  try {
    result = await generateFunnel({ ...input, productContext }, apiKey);
  } catch (err) {
    console.error(
      "[funnels/generate] fallo en generateFunnel:",
      err instanceof Error ? err.message : err
    );
    return aiErrorResponse(err);
  }

  // 4. Persistir: Funnel vinculado al Product. Campos complejos como JSON.
  try {
    const funnel = await prisma.funnel.create({
      data: {
        name: `Embudo · ${product.title}`,
        description: input.goal,
        pages: JSON.stringify({
          landingPage: result.landingPage,
          salesPage: result.salesPage,
          upsells: result.upsells,
        }),
        emailSequence: JSON.stringify(result.emailSequence),
        status: "draft",
        productId: product.id,
      },
      include: { product: true },
    });

    return NextResponse.json(serializeFunnel(funnel), { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error desconocido al guardar.";
    console.error("[funnels/generate] fallo al persistir:", message);
    return NextResponse.json(
      { error: `El embudo se generó pero no se pudo guardar: ${message}` },
      { status: 500 }
    );
  }
}
