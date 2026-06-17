import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { serializeEbook } from "@/lib/ebooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/ebooks — lista los ebooks guardados (más recientes primero).
export async function GET() {
  try {
    const ebooks = await prisma.ebook.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: true },
    });
    return NextResponse.json(ebooks.map(serializeEbook));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error desconocido.";
    console.error("[ebooks] fallo al listar:", message);
    return NextResponse.json(
      { error: `No se pudieron cargar los ebooks: ${message}` },
      { status: 500 }
    );
  }
}
