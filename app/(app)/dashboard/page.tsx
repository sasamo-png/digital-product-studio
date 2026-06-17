"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Euro,
  Percent,
  Package,
  BookOpen,
  Megaphone,
  Filter,
  AlertCircle,
  ArrowRight,
  Clock,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { navItems } from "@/lib/navigation";
import type {
  AnalyticsKpis,
  EntityCounts,
  RecentActivity,
  TopProduct,
} from "@/lib/analytics";

type DashboardData = {
  kpis: AnalyticsKpis;
  counts: EntityCounts;
  recent: RecentActivity;
  topProducts: TopProduct[];
};

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    n
  );

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });

// Accesos directos a los módulos de trabajo.
const shortcuts = navItems.filter((i) =>
  [
    "/market-research",
    "/ebook-generator",
    "/content-studio",
    "/funnel-builder",
    "/sales-assistant",
    "/analytics",
  ].includes(i.href)
);

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error al cargar el panel.");
      setData(json as DashboardData);
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
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Tu centro de control de productos digitales.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Cargando panel…</p>
      ) : data ? (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={Euro} label="Ingresos" value={eur(data.kpis.totalRevenue)} />
            <Kpi
              icon={Percent}
              label="Conversión"
              value={`${data.kpis.conversionRate.toFixed(1)}%`}
            />
            <Kpi icon={Package} label="Productos" value={String(data.counts.products)} />
            <Kpi icon={BookOpen} label="Ebooks" value={String(data.counts.ebooks)} />
          </div>

          {/* Accesos directos */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Módulos</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <Card className="group h-full transition-colors hover:border-primary">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <Icon className="h-7 w-7 text-primary" />
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        <CardTitle className="text-base">{item.title}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Actividad reciente */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Actividad reciente</h2>
            <div className="grid gap-4 lg:grid-cols-3">
              <RecentList
                icon={BookOpen}
                title="Ebooks"
                href="/ebook-generator"
                items={data.recent.ebooks.map((e) => ({
                  id: e.id,
                  primary: e.title,
                  date: e.createdAt,
                }))}
              />
              <RecentList
                icon={Megaphone}
                title="Contenido"
                href="/content-studio"
                items={data.recent.content.map((c) => ({
                  id: c.id,
                  primary: c.title,
                  secondary: c.platform,
                  date: c.createdAt,
                }))}
              />
              <RecentList
                icon={Filter}
                title="Embudos"
                href="/funnel-builder"
                items={data.recent.funnels.map((f) => ({
                  id: f.id,
                  primary: f.name,
                  date: f.createdAt,
                }))}
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Euro;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

type RecentItem = {
  id: string;
  primary: string;
  secondary?: string;
  date: string;
};

function RecentList({
  icon: Icon,
  title,
  href,
  items,
}: {
  icon: typeof BookOpen;
  title: string;
  href: string;
  items: RecentItem[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nada todavía.{" "}
            <Link href={href} className="text-primary hover:underline">
              Crear
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">{it.primary}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  {it.secondary && <Badge variant="secondary">{it.secondary}</Badge>}
                  <Clock className="h-3 w-3" />
                  {fmtDate(it.date)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
