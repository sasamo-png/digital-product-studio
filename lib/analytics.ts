import "server-only";

import { prisma } from "@/lib/prisma";

// ===========================================================================
// DECISIÓN DE DISEÑO: cálculo EN VIVO.
// Las métricas se agregan directamente desde las tablas fuente (Sale, Customer,
// Content, Product, …) en cada petición. Para la escala de esta app (un solo
// usuario) es la opción más simple y siempre consistente.
//
// La entidad `Analytics` del schema queda reservada para SNAPSHOTS históricos
// (p. ej. un job periódico que congele KPIs por día/semana). Cuando el volumen
// lo justifique, estas funciones pueden leer de esos snapshots en vez de
// recalcular. No se usan snapshots todavía.
// ===========================================================================

const COMPLETED = "completed";

export type AnalyticsKpis = {
  totalRevenue: number;
  salesCount: number;
  leads: number; // total de clientes (CRM)
  buyers: number; // clientes con al menos una venta completada
  conversionRate: number; // buyers / leads * 100
  avgOrderValue: number;
};

export type RevenuePoint = { period: string; revenue: number; sales: number };
export type TopProduct = {
  productId: string;
  title: string;
  revenue: number;
  sales: number;
};
export type PlatformPerformance = { platform: string; count: number };
export type EntityCounts = {
  products: number;
  ebooks: number;
  content: number;
  funnels: number;
  research: number;
  customers: number;
};
export type RecentActivity = {
  ebooks: { id: string; title: string; createdAt: string }[];
  content: {
    id: string;
    title: string;
    platform: string;
    createdAt: string;
  }[];
  funnels: { id: string; name: string; createdAt: string }[];
};

export async function getKpis(): Promise<AnalyticsKpis> {
  const [revenueAgg, leads, buyerGroups] = await Promise.all([
    prisma.sale.aggregate({
      where: { status: COMPLETED },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.customer.count(),
    prisma.sale.groupBy({
      by: ["customerId"],
      where: { status: COMPLETED },
    }),
  ]);

  const totalRevenue = revenueAgg._sum.amount ?? 0;
  const salesCount = revenueAgg._count._all;
  const buyers = buyerGroups.length;

  return {
    totalRevenue,
    salesCount,
    leads,
    buyers,
    conversionRate: leads > 0 ? (buyers / leads) * 100 : 0,
    avgOrderValue: salesCount > 0 ? totalRevenue / salesCount : 0,
  };
}

// Ingresos agregados por mes (YYYY-MM). Se agrega en JS para no depender del
// dialecto SQL; suficiente para el volumen actual. Se usa UTC para que el
// bucketing sea determinista e independiente de la zona horaria del servidor.
export async function getRevenueOverTime(): Promise<RevenuePoint[]> {
  const sales = await prisma.sale.findMany({
    where: { status: COMPLETED },
    select: { amount: true, date: true },
    orderBy: { date: "asc" },
  });

  const byMonth = new Map<string, { revenue: number; sales: number }>();
  for (const s of sales) {
    const d = s.date;
    const period = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = byMonth.get(period) ?? { revenue: 0, sales: 0 };
    bucket.revenue += s.amount;
    bucket.sales += 1;
    byMonth.set(period, bucket);
  }

  return Array.from(byMonth.entries()).map(([period, v]) => ({
    period,
    revenue: Math.round(v.revenue * 100) / 100,
    sales: v.sales,
  }));
}

export async function getTopProducts(limit = 5): Promise<TopProduct[]> {
  const grouped = await prisma.sale.groupBy({
    by: ["productId"],
    where: { status: COMPLETED },
    _sum: { amount: true },
    _count: { _all: true },
  });

  if (grouped.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((g) => g.productId) } },
    select: { id: true, title: true },
  });
  const titleById = new Map(products.map((p) => [p.id, p.title]));

  return grouped
    .map((g) => ({
      productId: g.productId,
      title: titleById.get(g.productId) ?? "(desconocido)",
      revenue: Math.round((g._sum.amount ?? 0) * 100) / 100,
      sales: g._count._all,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getPlatformPerformance(): Promise<PlatformPerformance[]> {
  const grouped = await prisma.content.groupBy({
    by: ["platform"],
    _count: { _all: true },
  });
  return grouped
    .map((g) => ({ platform: g.platform, count: g._count._all }))
    .sort((a, b) => b.count - a.count);
}

export async function getCounts(): Promise<EntityCounts> {
  const [products, ebooks, content, funnels, research, customers] =
    await Promise.all([
      prisma.product.count(),
      prisma.ebook.count(),
      prisma.content.count(),
      prisma.funnel.count(),
      prisma.marketResearch.count(),
      prisma.customer.count(),
    ]);
  return { products, ebooks, content, funnels, research, customers };
}

export async function getRecentActivity(): Promise<RecentActivity> {
  const [ebooks, content, funnels] = await Promise.all([
    prisma.ebook.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, createdAt: true },
    }),
    prisma.content.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, platform: true, createdAt: true },
    }),
    prisma.funnel.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, createdAt: true },
    }),
  ]);

  return {
    ebooks: ebooks.map((e) => ({
      id: e.id,
      title: e.title,
      createdAt: e.createdAt.toISOString(),
    })),
    content: content.map((c) => ({
      id: c.id,
      title: c.title ?? "(sin título)",
      platform: c.platform,
      createdAt: c.createdAt.toISOString(),
    })),
    funnels: funnels.map((f) => ({
      id: f.id,
      name: f.name,
      createdAt: f.createdAt.toISOString(),
    })),
  };
}
