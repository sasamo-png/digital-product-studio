import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  generateSalesScripts,
  generateSalesScriptsInputSchema,
} from "@/lib/ai/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// NOTA: no se persiste. Los scripts de venta son material efímero/contextual y
// ninguna entidad del schema los representa de forma coherente (Content es para
// contenido publicable por plataforma). Si en el futuro se quiere historial,
// lo natural sería un modelo nuevo `SalesScript`. Por ahora solo se devuelven.

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
  const parsed = generateSalesScriptsInputSchema.safeParse(body);
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

  // 2b. Contexto opcional del producto.
  let productContext: string | undefined;
  if (input.productId) {
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
    });
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

  // 3. Generar los scripts con IA (lado servidor).
  try {
    const result = await generateSalesScripts({ ...input, productContext });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error desconocido en la generación.";
    console.error("[sales/scripts] fallo en generateSalesScripts:", message);
    return NextResponse.json(
      { error: `No se pudieron generar los scripts: ${message}` },
      { status: 502 }
    );
  }
}
