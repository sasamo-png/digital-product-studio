"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Euro,
  ShoppingCart,
  Users,
  Percent,
  AlertCircle,
  RefreshCw,
  BarChart3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  AnalyticsKpis,
  RevenuePoint,
  TopProduct,
  PlatformPerformance,
} from "@/lib/analytics";

type AnalyticsData = {
  kpis: AnalyticsKpis;
  revenue: RevenuePoint[];
  topProducts: TopProduct[];
  platforms: PlatformPerformance[];
};

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    n
  );

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error al cargar métricas.");
      setData(json as AnalyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Analítica</h1>
          <p className="text-muted-foreground">
            Métricas de negocio agregadas en vivo desde tus datos.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={load} aria-label="Recargar">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Cargando métricas…</p>
      ) : data ? (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Euro}
              label="Ingresos totales"
              value={eur(data.kpis.totalRevenue)}
            />
            <StatCard
              icon={ShoppingCart}
              label="Ventas"
              value={String(data.kpis.salesCount)}
              hint={`Ticket medio ${eur(data.kpis.avgOrderValue)}`}
            />
            <StatCard
              icon={Users}
              label="Leads (CRM)"
              value={String(data.kpis.leads)}
              hint={`${data.kpis.buyers} compradores`}
            />
            <StatCard
              icon={Percent}
              label="Conversión"
              value={`${data.kpis.conversionRate.toFixed(1)}%`}
            />
          </div>

          {/* Ingresos en el tiempo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ingresos en el tiempo</CardTitle>
            </CardHeader>
            <CardContent>
              {data.revenue.length === 0 ? (
                <EmptyState text="Aún no hay ventas registradas. Cuando crees ventas (Sale), verás aquí la evolución de ingresos." />
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.revenue}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="period" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip
                        formatter={(v: number) => eur(v)}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        fill="url(#rev)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top productos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top productos</CardTitle>
              </CardHeader>
              <CardContent>
                {data.topProducts.length === 0 ? (
                  <EmptyState text="Sin ventas por producto todavía." />
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.topProducts} layout="vertical">
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis type="number" fontSize={12} />
                        <YAxis
                          type="category"
                          dataKey="title"
                          width={120}
                          fontSize={12}
                        />
                        <Tooltip
                          formatter={(v: number) => eur(v)}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Bar
                          dataKey="revenue"
                          fill="hsl(var(--primary))"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rendimiento por plataforma (Content) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contenido por plataforma</CardTitle>
              </CardHeader>
              <CardContent>
                {data.platforms.length === 0 ? (
                  <EmptyState text="Aún no has generado contenido." />
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.platforms}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis dataKey="platform" fontSize={12} />
                        <YAxis allowDecimals={false} fontSize={12} />
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Bar
                          dataKey="count"
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Euro;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-2xl font-bold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <BarChart3 className="h-8 w-8 opacity-40" />
      <p className="max-w-xs text-sm">{text}</p>
    </div>
  );
}
