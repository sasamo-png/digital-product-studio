import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { serializeMarketResearch } from "@/lib/market-research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/market-research — lista las investigaciones guardadas (recientes primero).
export async function GET() {
  try {
    const research = await prisma.marketResearch.findMany({
      orderBy: { createdAt: "desc" },
      include: { competitors: true },
    });
    return NextResponse.json(research.map(serializeMarketResearch));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    console.error("[market-research] fallo al listar:", message);
    return NextResponse.json(
      { error: `No se pudieron cargar las investigaciones: ${message}` },
      { status: 500 }
    );
  }
}
