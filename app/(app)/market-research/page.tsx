"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Loader2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Swords,
  Coins,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { type MarketResearchDTO } from "@/lib/market-research";

type FormState = { niche: string; notes: string };

const EMPTY_FORM: FormState = { niche: "", notes: "" };

// Para demanda/rentabilidad: más alto = mejor (verde). Para competencia: invertido.
function scoreColor(value: number, higherIsBetter: boolean): string {
  const good = higherIsBetter ? value >= 50 : value < 50;
  if (good) return value >= 67 || (!higherIsBetter && value < 34)
    ? "bg-emerald-500"
    : "bg-amber-500";
  return value >= 67 ? "bg-red-500" : "bg-amber-500";
}

export default function MarketResearchPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [history, setHistory] = useState<MarketResearchDTO[]>([]);
  const [selected, setSelected] = useState<MarketResearchDTO | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/market-research", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data: MarketResearchDTO[] = await res.json();
      setHistory(data);
    } catch {
      // silencioso
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/market-research/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: form.niche,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const issues = data?.issues
          ? Object.values(data.issues).flat().join(" ")
          : "";
        throw new Error(
          [data?.error, issues].filter(Boolean).join(" ") ||
            "Error al analizar el nicho."
        );
      }
      const created = data as MarketResearchDTO;
      setHistory((prev) => [created, ...prev]);
      setSelected(created);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Investigación de mercado
        </h1>
        <p className="text-muted-foreground">
          Analiza un nicho con IA: demanda, competencia, rentabilidad y
          competidores clave.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        {/* Columna izquierda: formulario + historial */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Search className="h-5 w-5 text-primary" />
                Analizar un nicho
              </CardTitle>
              <CardDescription>
                Introduce el nicho y, opcionalmente, contexto adicional.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAnalyze} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="niche">Nicho</Label>
                  <Input
                    id="niche"
                    placeholder="Ej: finanzas personales para autónomos"
                    value={form.niche}
                    onChange={(e) => updateField("niche", e.target.value)}
                    required
                    minLength={2}
                    disabled={isAnalyzing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas / contexto (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Ej: enfoque en España, formato curso online…"
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    disabled={isAnalyzing}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analizando…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analizar nicho
                    </>
                  )}
                </Button>
              </form>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xl">Investigaciones previas</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={loadHistory}
                aria-label="Recargar"
              >
                <RefreshCw
                  className={cn("h-4 w-4", loadingList && "animate-spin")}
                />
              </Button>
            </CardHeader>
            <CardContent>
              {loadingList ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay investigaciones. Analiza el primer nicho arriba.
                </p>
              ) : (
                <ul className="space-y-2">
                  {history.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => setSelected(r)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent",
                          selected?.id === r.id && "border-primary bg-accent"
                        )}
                      >
                        <Search className="h-5 w-5 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {r.niche}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            Rentabilidad {r.profitScore}/100 ·{" "}
                            {r.competitors.length} competidores
                          </p>
                        </div>
                        <Badge variant="secondary">{r.profitScore}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: resultados */}
        <div>
          {selected ? (
            <ResearchResult research={selected} />
          ) : (
            <Card className="flex h-full min-h-[300px] items-center justify-center">
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Search className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">
                  Analiza o selecciona un nicho para ver los resultados.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreRow({
  icon: Icon,
  label,
  value,
  higherIsBetter,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: number;
  higherIsBetter: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </span>
        <span className="tabular-nums text-muted-foreground">{value}/100</span>
      </div>
      <Progress
        value={value}
        indicatorClassName={scoreColor(value, higherIsBetter)}
      />
    </div>
  );
}

function ResearchResult({ research }: { research: MarketResearchDTO }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-2xl">{research.niche}</CardTitle>
          <Badge variant="secondary">{research.status}</Badge>
        </div>
        <CardDescription>Análisis de mercado del nicho</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-4">
          <ScoreRow
            icon={TrendingUp}
            label="Demanda"
            value={research.demandScore}
            higherIsBetter
          />
          <ScoreRow
            icon={Swords}
            label="Competencia"
            value={research.competitionScore}
            higherIsBetter={false}
          />
          <ScoreRow
            icon={Coins}
            label="Rentabilidad"
            value={research.profitScore}
            higherIsBetter
          />
        </section>

        {research.summary && (
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Resumen ejecutivo
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {research.summary}
            </p>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Competidores ({research.competitors.length})
          </h3>
          {research.competitors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin competidores identificados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fortaleza</TableHead>
                  <TableHead>Debilidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {research.competitors.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.strength}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.weakness}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
