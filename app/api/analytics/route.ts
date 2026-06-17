import { NextResponse } from "next/server";

import {
  getKpis,
  getRevenueOverTime,
  getTopProducts,
  getPlatformPerformance,
} from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/analytics — KPIs y series agregadas (cálculo en vivo).
export async function GET() {
  try {
    const [kpis, revenue, topProducts, platforms] = await Promise.all([
      getKpis(),
      getRevenueOverTime(),
      getTopProducts(5),
      getPlatformPerformance(),
    ]);
    return NextResponse.json({ kpis, revenue, topProducts, platforms });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    console.error("[analytics] fallo:", message);
    return NextResponse.json(
      { error: `No se pudieron cargar las métricas: ${message}` },
      { status: 500 }
    );
  }
}
