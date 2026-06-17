import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/products — lista ligera de productos (para selectores).
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, type: true, status: true },
    });
    return NextResponse.json(products);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    console.error("[products] fallo al listar:", message);
    return NextResponse.json(
      { error: `No se pudieron cargar los productos: ${message}` },
      { status: 500 }
    );
  }
}
