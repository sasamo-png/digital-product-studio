import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  generateSalesScripts,
  generateSalesScriptsInputSchema,
} from "@/lib/ai/sales";
import { getUserApiKey, aiErrorResponse } from "@/lib/ai/request-key";
import { readJsonBody, jsonBodyErrorResponse } from "@/lib/http";

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

  // 3. API key del usuario (BYOK) ANTES de tocar la BD.
  let apiKey: string;
  try {
    apiKey = getUserApiKey(request);
  } catch (err) {
    return aiErrorResponse(err);
  }

  // 3b. Contexto opcional del producto.
  let productContext: string | undefined;
  if (input.productId) {
    let product;
    try {
      product = await prisma.product.findUnique({
        where: { id: input.productId },
      });
    } catch (err) {
      console.error(
        "[sales/scripts] fallo al cargar el producto:",
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

  try {
    const result = await generateSalesScripts({ ...input, productContext }, apiKey);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error(
      "[sales/scripts] fallo en generateSalesScripts:",
      err instanceof Error ? err.message : err
    );
    return aiErrorResponse(err);
  }
}
