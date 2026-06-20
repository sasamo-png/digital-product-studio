"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Radar,
  Search,
  Loader2,
  AlertCircle,
  Flame,
  ExternalLink,
  Download,
  Trophy,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiKeyHeaders, useApiKey } from "@/lib/use-api-key";
import { RADAR_COUNTRIES, type RadarAd, type RadarResult } from "@/lib/radar";

const selectClass =
  "h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type SortBy = "adv" | "recent" | "old";
type TypeFilter = "all" | "video" | "image";

export default function RadarPage() {
  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState("ALL");
  const [minAds, setMinAds] = useState(3);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RadarResult | null>(null);

  const [selectedAdv, setSelectedAdv] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("adv");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const { hasKey } = useApiKey();

  // Contador de tiempo en vivo durante el escaneo.
  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  const advOf = (a: RadarAd) => a.advertiser || data?.pageName || "Desconocido";

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    if (data) for (const a of data.ads) c[advOf(a)] = (c[advOf(a)] || 0) + 1;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const rank = useMemo(
    () =>
      Object.entries(counts).sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
      ),
    [counts]
  );

  // Top anunciantes: solo los que alcanzan el mínimo de anuncios en esta búsqueda.
  const topRank = useMemo(
    () => rank.filter(([, c]) => c >= minAds),
    [rank, minAds]
  );

  const shown = useMemo(() => {
    if (!data) return [] as RadarAd[];
    let list = selectedAdv
      ? data.ads.filter((a) => advOf(a) === selectedAdv)
      : data.ads.filter((a) => (counts[advOf(a)] || 0) >= minAds);
    if (typeFilter !== "all") list = list.filter((a) => a.mediaKind === typeFilter);
    const arr = [...list];
    if (sortBy === "recent")
      arr.sort((x, y) => (y.startedScore || -1) - (x.startedScore || -1));
    else if (sortBy === "old")
      arr.sort((x, y) => (x.startedScore || Infinity) - (y.startedScore || Infinity));
    else
      arr.sort(
        (x, y) =>
          (counts[advOf(y)] || 0) - (counts[advOf(x)] || 0) ||
          advOf(x).localeCompare(advOf(y))
      );
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selectedAdv, minAds, typeFilter, sortBy, counts]);

  async function runSearch(kw: string) {
    const term = kw.trim();
    if (!term) return;
    setError(null);
    setLoading(true);
    setData(null);
    setSelectedAdv(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 150_000);
      const res = await fetch("/api/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiKeyHeaders() },
        body: JSON.stringify({ keyword: term, country }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo completar el análisis.");
      setData(json as RadarResult);
    } catch (err) {
      setError(
        err instanceof Error && err.name === "AbortError"
          ? "El análisis tardó demasiado. Inténtalo de nuevo."
          : err instanceof Error
            ? err.message
            : "Error inesperado."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    runSearch(keyword);
  }

  // Re-analiza por el nombre del anunciante → muestra TODOS sus anuncios, no solo
  // los que coincidían con la búsqueda anterior. El KPI "Resultados activos" pasa
  // a reflejar el total real de ese anunciante.
  function deepScanAdvertiser(name: string) {
    setKeyword(name);
    runSearch(name);
  }

  function exportData(fmt: "csv" | "json") {
    if (!data || !shown.length) return;
    const rows = shown.map((a) => ({
      anunciante: advOf(a),
      anuncios_activos: counts[advOf(a)] || 1,
      tipo: a.creativeType,
      cta: a.cta || "",
      fecha_inicio: a.startedAt,
      copy: a.copy,
      landing: a.landing || "",
      library_id: a.libraryId || "",
      url_meta: a.libraryUrl || "",
    }));
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const fname = `radar-${(keyword.trim() || "export").replace(/[^a-z0-9]+/gi, "_")}-${country}-${stamp}`;
    if (fmt === "json") {
      const payload = {
        palabra_clave: keyword.trim(),
        pais: country,
        pagina: data.pageName,
        nicho: data.niche,
        angulo: data.angle,
        resultados_activos: data.activeResultsCount,
        exportado: new Date().toISOString(),
        total: rows.length,
        anuncios: rows,
      };
      downloadBlob(JSON.stringify(payload, null, 2), `${fname}.json`, "application/json");
    } else {
      const headers = Object.keys(rows[0]);
      const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csv = [headers.join(",")]
        .concat(rows.map((r) => headers.map((h) => cell((r as Record<string, unknown>)[h])).join(",")))
        .join("\r\n");
      downloadBlob("﻿" + csv, `${fname}.csv`, "text/csv;charset=utf-8");
    }
  }

  const v = data?.validation;
  const vColor =
    !v ? "" : v.score >= 75
      ? "text-emerald-500 border-emerald-500/40 bg-emerald-500/10"
      : v.score >= 45
        ? "text-amber-500 border-amber-500/40 bg-amber-500/10"
        : "text-red-500 border-red-500/40 bg-red-500/10";

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Radar className="h-7 w-7 text-primary" />
          Radar de Anuncios
        </h1>
        <p className="text-muted-foreground">
          Espía ofertas activas en la Biblioteca de Anuncios de Meta: detecta
          quién más escala, mira sus creativos y exporta los datos.
        </p>
      </div>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Search className="h-5 w-5 text-primary" />
            Buscar anuncios
          </CardTitle>
          <CardDescription>
            Por palabra clave (un nicho) o por nombre de un anunciante. Cada
            análisis tarda ~60s.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
            <div className="flex-1 space-y-2" style={{ minWidth: 220 }}>
              <Label htmlFor="kw">Palabra clave o anunciante</Label>
              <Input
                id="kw"
                placeholder="ej: anti-inflamatorio, Dioxaflex.VL…"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <select
                id="country"
                className={selectClass}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={loading}
              >
                {RADAR_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minAds">Mín. anuncios / anunciante</Label>
              <Input
                id="minAds"
                type="number"
                min={1}
                className="w-28"
                value={minAds}
                onChange={(e) => setMinAds(Math.max(1, Number(e.target.value) || 1))}
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizando… {elapsed}s
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Analizar
                </>
              )}
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            {hasKey ? (
              <>
                <Sparkles className="mr-1 inline h-3 w-3" />
                El nicho se clasificará con tu IA (OpenAI).
              </>
            ) : (
              "Sin API key, el nicho lo estima el robot. Añade tu key en Ajustes para clasificarlo con IA."
            )}
          </p>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {data && (
        <>
          {/* Estado / página detectada */}
          <p className="text-sm text-muted-foreground">
            Página destacada: <span className="font-semibold text-foreground">{data.pageName}</span>
          </p>

          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi k="Resultados activos" v={data.activeResultsCount?.toLocaleString("es-ES") ?? "—"} />
            <Kpi k="Anuncios extraídos" v={String(data.adsExtracted)} />
            <Kpi
              k={data.nicheSource === "ia" ? "Nicho (IA)" : "Nicho (robot)"}
              v={data.niche}
            />
            <Kpi k="Más antiguo" v={data.oldestAdDate} />
            <Kpi k="Más reciente" v={data.newestAdDate} />
          </div>

          {/* Validación + ángulo */}
          <div className="space-y-2">
            {v && (
              <Badge variant="outline" className={cn("text-sm", vColor)}>
                Validación {v.score} · {v.status}
              </Badge>
            )}
            {data.angle && (
              <p className="text-sm text-muted-foreground">
                <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">Ángulo:</span> {data.angle}
              </p>
            )}
            {v && v.reasons.length > 0 && (
              <p className="text-xs text-muted-foreground">{v.reasons.map((r) => `• ${r}`).join("  ")}</p>
            )}
          </div>

          {/* Top anunciantes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-amber-500" />
                Top anunciantes ({topRank.length})
              </CardTitle>
              <CardDescription>
                Anunciantes con ≥ {minAds} anuncios <b>en esta búsqueda</b> (ajusta el mínimo arriba).
                El número es cuántos aparecen aquí, no su total. Clic para filtrar; luego puedes
                analizar <b>todos</b> sus anuncios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {topRank.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    Ningún anunciante llega a {minAds} anuncios en esta búsqueda. Baja el mínimo.
                  </span>
                )}
                {topRank.map(([name, c], i) => (
                  <button
                    key={name}
                    onClick={() => setSelectedAdv((cur) => (cur === name ? null : name))}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selectedAdv === name
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:border-primary"
                    )}
                  >
                    {i + 1}. {name}{" "}
                    <span
                      className={cn(
                        "font-bold",
                        selectedAdv === name ? "" : "text-emerald-500"
                      )}
                    >
                      {c}
                    </span>
                  </button>
                ))}
                {selectedAdv && (
                  <button
                    onClick={() => setSelectedAdv(null)}
                    className="rounded-full border border-amber-500 px-3 py-1.5 text-sm text-amber-500"
                  >
                    ✕ Quitar filtro
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Barra de herramientas */}
          <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
            <div className="space-y-1">
              <Label htmlFor="sortBy">Ordenar por</Label>
              <select
                id="sortBy"
                className={selectClass}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
              >
                <option value="adv">Top anunciantes</option>
                <option value="recent">Más recientes</option>
                <option value="old">Más antiguos</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="typeFilter">Tipo de creativo</Label>
              <select
                id="typeFilter"
                className={selectClass}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              >
                <option value="all">Todos</option>
                <option value="video">Solo vídeo</option>
                <option value="image">Solo imagen</option>
              </select>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportData("csv")}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportData("json")}>
                <Download className="h-4 w-4" /> JSON
              </Button>
            </div>
          </div>

          {/* Resultados */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">
              {selectedAdv ? (
                <>Anuncios de <span className="text-primary">{selectedAdv}</span></>
              ) : (
                <>Anunciantes con ≥ {minAds} anuncios en esta búsqueda</>
              )}{" "}
              · {shown.length} creativos
            </h2>
            {selectedAdv && (
              <Button
                variant="outline"
                size="sm"
                className="mb-3"
                disabled={loading}
                onClick={() => deepScanAdvertiser(selectedAdv)}
              >
                <Search className="h-4 w-4" /> Ver TODOS los anuncios de «{selectedAdv}» (nuevo análisis ~60s)
              </Button>
            )}
            {shown.length === 0 ? (
              <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                {typeFilter !== "all"
                  ? `No hay anuncios de tipo ${typeFilter === "video" ? "vídeo" : "imagen"} en la selección. Cambia el filtro de tipo.`
                  : `Ningún anunciante alcanza ${minAds} anuncios en esta muestra. Baja el mínimo o pulsa un anunciante del Top.`}
              </p>
            ) : (
              <div className="space-y-8">
                {(() => {
                  // Agrupa los anuncios visibles por anunciante (preservando el orden
                  // de `shown` dentro de cada grupo); anunciantes ordenados por nº de
                  // anuncios en esta búsqueda (desc) y, a igualdad, por nombre.
                  const groups = new Map<string, RadarAd[]>();
                  for (const ad of shown) {
                    const name = advOf(ad);
                    const list = groups.get(name);
                    if (list) list.push(ad);
                    else groups.set(name, [ad]);
                  }
                  return [...groups.entries()]
                    .sort(
                      (a, b) =>
                        (counts[b[0]] || 0) - (counts[a[0]] || 0) ||
                        a[0].localeCompare(b[0])
                    )
                    .map(([name, ads]) => (
                      <section key={name} className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2 border-b pb-2">
                          <h3 className="text-base font-semibold">{name}</h3>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500">
                            <Flame className="h-3 w-3" />
                            {counts[name] || ads.length} en esta búsqueda
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {ads.map((ad, i) => (
                            <AdCard key={(ad.libraryId || "") + i} ad={ad} count={counts[advOf(ad)] || 1} />
                          ))}
                        </div>
                      </section>
                    ));
                })()}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ k, v }: { k: string; v: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xl font-bold">{v}</div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{k}</div>
      </CardContent>
    </Card>
  );
}

function AdCard({ ad, count }: { ad: RadarAd; count: number }) {
  const [expanded, setExpanded] = useState(false);
  const long = ad.copy.length > 150;
  return (
    <Card className="flex flex-col overflow-hidden p-0">
      {ad.video ? (
        <video
          controls
          preload="none"
          poster={ad.image ?? undefined}
          src={ad.video}
          className="h-44 w-full bg-black object-cover"
        />
      ) : ad.image ? (
        ad.libraryUrl ? (
          <a href={ad.libraryUrl} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ad.image} alt="" className="h-44 w-full bg-black object-cover" />
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.image} alt="" className="h-44 w-full bg-black object-cover" />
        )
      ) : null}

      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2 font-semibold">
          <span>{ad.advertiser ?? "—"}</span>
          <span
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500"
            title="Anuncios de este anunciante encontrados en esta búsqueda (no su total)"
          >
            <Flame className="h-3 w-3" />
            {count} en esta búsqueda
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{ad.creativeType}</Badge>
          {ad.cta && <Badge variant="outline">{ad.cta}</Badge>}
          {ad.startedAt !== "—" && <Badge variant="outline">📅 {ad.startedAt}</Badge>}
        </div>
        <p
          className={cn(
            "whitespace-pre-wrap text-sm text-muted-foreground",
            !expanded && long && "max-h-24 overflow-hidden"
          )}
        >
          {ad.copy || "(sin texto)"}
        </p>
        {long && (
          <button
            onClick={() => setExpanded((x) => !x)}
            className="text-xs font-semibold text-primary"
          >
            {expanded ? "ver menos ▴" : "ver más ▾"}
          </button>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {ad.libraryUrl && (
            <a
              href={ad.libraryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <ExternalLink className="h-3 w-3" /> Ver en Meta
            </a>
          )}
          {ad.landing && (
            <a
              href={ad.landing}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-semibold"
            >
              🌐 Landing
            </a>
          )}
        </div>
        {ad.libraryId && (
          <p className="text-xs text-muted-foreground">ID: {ad.libraryId}</p>
        )}
      </div>
    </Card>
  );
}

function downloadBlob(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
