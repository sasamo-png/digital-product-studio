import { NextResponse } from "next/server";

import { getKpis, getCounts, getRecentActivity, getTopProducts } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/dashboard — resumen para el centro de control.
export async function GET() {
  try {
    const [kpis, counts, recent, topProducts] = await Promise.all([
      getKpis(),
      getCounts(),
      getRecentActivity(),
      getTopProducts(3),
    ]);
    return NextResponse.json({ kpis, counts, recent, topProducts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    console.error("[dashboard] fallo:", message);
    return NextResponse.json(
      { error: `No se pudo cargar el dashboard: ${message}` },
      { status: 500 }
    );
  }
}
