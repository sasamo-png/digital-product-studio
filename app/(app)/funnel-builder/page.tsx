"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Filter,
  Loader2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Mail,
  ArrowUpCircle,
  LayoutTemplate,
  FileText,
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
import { CopyButton } from "@/components/copy-button";
import { ApiKeyNotice } from "@/components/api-key-notice";
import { cn } from "@/lib/utils";
import { apiKeyHeaders, useApiKey } from "@/lib/use-api-key";
import { type FunnelDTO } from "@/lib/funnel";

type ProductOption = { id: string; title: string };
type FormState = { productId: string; goal: string; audience: string };
const EMPTY_FORM: FormState = { productId: "", goal: "", audience: "" };

export default function FunnelBuilderPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [funnels, setFunnels] = useState<FunnelDTO[]>([]);
  const [selected, setSelected] = useState<FunnelDTO | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const { hasKey } = useApiKey();

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (!res.ok) return;
      const data: { id: string; title: string }[] = await res.json();
      setProducts(data.map((p) => ({ id: p.id, title: p.title })));
    } catch {
      // ignorar
    }
  }, []);

  const loadFunnels = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/funnels", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data: FunnelDTO[] = await res.json();
      setFunnels(data);
    } catch {
      // silencioso
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadFunnels();
  }, [loadProducts, loadFunnels]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.productId) {
      setError("Selecciona un producto.");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch("/api/funnels/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiKeyHeaders() },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        const issues = data?.issues
          ? Object.values(data.issues).flat().join(" ")
          : "";
        throw new Error(
          [data?.error, issues].filter(Boolean).join(" ") ||
            "Error al generar el embudo."
        );
      }
      const created = data as FunnelDTO;
      setFunnels((prev) => [created, ...prev]);
      setSelected(created);
      setForm((prev) => ({ ...EMPTY_FORM, productId: prev.productId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Constructor de embudos
        </h1>
        <p className="text-muted-foreground">
          Genera un embudo de venta completo para un producto: landing, página de
          ventas, emails y upsells.
        </p>
      </div>

      <ApiKeyNotice />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        {/* Columna izquierda */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Filter className="h-5 w-5 text-primary" />
                Nuevo embudo
              </CardTitle>
              <CardDescription>
                Elige el producto, el objetivo y la audiencia.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Producto</Label>
                  <select
                    id="product"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={form.productId}
                    onChange={(e) => updateField("productId", e.target.value)}
                    disabled={isGenerating}
                    required
                  >
                    <option value="">— Selecciona un producto —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  {products.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No hay productos. Crea uno en el generador de ebooks
                      primero.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal">Objetivo</Label>
                  <Input
                    id="goal"
                    placeholder="Ej: vender el ebook a 27€ con upsell de mentoría"
                    value={form.goal}
                    onChange={(e) => updateField("goal", e.target.value)}
                    required
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audience">Audiencia</Label>
                  <Textarea
                    id="audience"
                    placeholder="Ej: emprendedores primerizos que quieren su primer producto digital"
                    value={form.audience}
                    onChange={(e) => updateField("audience", e.target.value)}
                    required
                    disabled={isGenerating}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isGenerating || !hasKey}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generando…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generar embudo
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
              <CardTitle className="text-xl">Embudos guardados</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={loadFunnels}
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
              ) : funnels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay embudos. Genera el primero arriba.
                </p>
              ) : (
                <ul className="space-y-2">
                  {funnels.map((f) => (
                    <li key={f.id}>
                      <button
                        onClick={() => setSelected(f)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent",
                          selected?.id === f.id && "border-primary bg-accent"
                        )}
                      >
                        <Filter className="h-5 w-5 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {f.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {f.emailSequence.length} emails ·{" "}
                            {f.upsells.length} upsells
                          </p>
                        </div>
                        <Badge variant="secondary">{f.status}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: resultado */}
        <div>
          {selected ? (
            <FunnelResult funnel={selected} />
          ) : (
            <Card className="flex h-full min-h-[300px] items-center justify-center">
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Filter className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">
                  Genera o selecciona un embudo para ver su contenido.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  copyText,
}: {
  icon: typeof Mail;
  title: string;
  copyText: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      <CopyButton text={copyText} />
    </div>
  );
}

function FunnelResult({ funnel }: { funnel: FunnelDTO }) {
  const lp = funnel.landingPage;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{funnel.name}</CardTitle>
        {funnel.goal && <CardDescription>Objetivo: {funnel.goal}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Landing page */}
        {lp && (
          <section className="space-y-2">
            <SectionHeader
              icon={LayoutTemplate}
              title="Landing page"
              copyText={`${lp.headline}\n${lp.subheadline}\n\n${lp.bullets
                .map((b) => `• ${b}`)
                .join("\n")}\n\nCTA: ${lp.cta}`}
            />
            <div className="rounded-md border p-4">
              <p className="text-lg font-semibold">{lp.headline}</p>
              <p className="mb-3 text-muted-foreground">{lp.subheadline}</p>
              <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
                {lp.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
              <Badge>{lp.cta}</Badge>
            </div>
          </section>
        )}

        {/* Sales page */}
        {funnel.salesSections.length > 0 && (
          <section className="space-y-2">
            <SectionHeader
              icon={FileText}
              title="Página de ventas"
              copyText={funnel.salesSections
                .map((s) => `## ${s.title}\n${s.content}`)
                .join("\n\n")}
            />
            <div className="space-y-3">
              {funnel.salesSections.map((s, i) => (
                <div key={i} className="rounded-md border p-3">
                  <p className="mb-1 font-medium">{s.title}</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {s.content}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Email sequence */}
        {funnel.emailSequence.length > 0 && (
          <section className="space-y-2">
            <SectionHeader
              icon={Mail}
              title={`Secuencia de emails (${funnel.emailSequence.length})`}
              copyText={funnel.emailSequence
                .map((e, i) => `Email ${i + 1}\nAsunto: ${e.subject}\n\n${e.body}`)
                .join("\n\n———\n\n")}
            />
            <div className="space-y-3">
              {funnel.emailSequence.map((e, i) => (
                <div key={i} className="rounded-md border p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-medium">
                      {i + 1}. {e.subject}
                    </p>
                    <CopyButton text={`Asunto: ${e.subject}\n\n${e.body}`} />
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {e.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Upsells */}
        {funnel.upsells.length > 0 && (
          <section className="space-y-2">
            <SectionHeader
              icon={ArrowUpCircle}
              title="Upsells"
              copyText={funnel.upsells
                .map((u) => `${u.name}: ${u.description}`)
                .join("\n")}
            />
            <div className="space-y-2">
              {funnel.upsells.map((u, i) => (
                <div key={i} className="rounded-md border p-3">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-muted-foreground">{u.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
