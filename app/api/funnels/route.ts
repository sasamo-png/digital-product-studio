import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { serializeFunnel } from "@/lib/funnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/funnels — lista los embudos guardados (más recientes primero).
export async function GET() {
  try {
    const funnels = await prisma.funnel.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: true },
    });
    return NextResponse.json(funnels.map(serializeFunnel));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    console.error("[funnels] fallo al listar:", message);
    return NextResponse.json(
      { error: `No se pudieron cargar los embudos: ${message}` },
      { status: 500 }
    );
  }
}
