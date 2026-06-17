"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MessagesSquare,
  Loader2,
  Sparkles,
  AlertCircle,
  Send,
  ShieldQuestion,
  Handshake,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";
import {
  SALES_CHANNELS,
  SALES_CHANNEL_LABELS,
  type SalesChannel,
} from "@/lib/sales";
import { type ObjectionHandler } from "@/lib/ai/sales";

type ScriptsResult = {
  dmScripts: string[];
  objectionHandlers: ObjectionHandler[];
  closingScripts: string[];
};

type ProductOption = { id: string; title: string };

type TabKey = "dms" | "objections" | "closing";

const TABS: { key: TabKey; label: string; icon: typeof Send }[] = [
  { key: "dms", label: "DMs", icon: Send },
  { key: "objections", label: "Objeciones", icon: ShieldQuestion },
  { key: "closing", label: "Cierre", icon: Handshake },
];

export default function SalesAssistantPage() {
  const [scenario, setScenario] = useState("");
  const [channel, setChannel] = useState<SalesChannel>(SALES_CHANNELS[0]);
  const [productId, setProductId] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [result, setResult] = useState<ScriptsResult | null>(null);
  const [tab, setTab] = useState<TabKey>("dms");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (!res.ok) return;
      const data: { id: string; title: string }[] = await res.json();
      setProducts(data.map((p) => ({ id: p.id, title: p.title })));
    } catch {
      // selector opcional
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsGenerating(true);
    try {
      const res = await fetch("/api/sales/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          channel,
          productId: productId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const issues = data?.issues
          ? Object.values(data.issues).flat().join(" ")
          : "";
        throw new Error(
          [data?.error, issues].filter(Boolean).join(" ") ||
            "Error al generar los scripts."
        );
      }
      setResult(data as ScriptsResult);
      setTab("dms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Asistente de ventas</h1>
        <p className="text-muted-foreground">
          Genera scripts de contacto, manejo de objeciones y cierre adaptados a
          tu canal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <MessagesSquare className="h-5 w-5 text-primary" />
            Configurar el caso de venta
          </CardTitle>
          <CardDescription>
            Describe el escenario y elige el canal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scenario">Escenario</Label>
              <Textarea
                id="scenario"
                placeholder="Ej: lead que descargó un lead magnet gratis y mostró interés pero no respondió"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                required
                minLength={2}
                disabled={isGenerating}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="channel">Canal</Label>
                <select
                  id="channel"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as SalesChannel)}
                  disabled={isGenerating}
                >
                  {SALES_CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {SALES_CHANNEL_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product">Producto (opcional)</Label>
                <select
                  id="product"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  disabled={isGenerating}
                >
                  <option value="">— Ninguno —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar scripts
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

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => {
                const Icon = t.icon;
                const count =
                  t.key === "dms"
                    ? result.dmScripts.length
                    : t.key === "objections"
                    ? result.objectionHandlers.length
                    : result.closingScripts.length;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
                      tab === t.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label} ({count})
                  </button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tab === "dms" &&
              result.dmScripts.map((s, i) => (
                <ScriptCard key={i} text={s} />
              ))}

            {tab === "objections" &&
              result.objectionHandlers.map((o, i) => (
                <div key={i} className="rounded-md border p-3">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="font-medium">“{o.objection}”</p>
                    <CopyButton text={`Objeción: ${o.objection}\n\n${o.response}`} />
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {o.response}
                  </p>
                </div>
              ))}

            {tab === "closing" &&
              result.closingScripts.map((s, i) => (
                <ScriptCard key={i} text={s} />
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ScriptCard({ text }: { text: string }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border p-3">
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
      <CopyButton text={text} />
    </div>
  );
}
