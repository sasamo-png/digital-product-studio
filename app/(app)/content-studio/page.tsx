"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Megaphone,
  Loader2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Instagram,
  Facebook,
  Music2,
  Hash,
  Mail,
  type LucideIcon,
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
import {
  CONTENT_PLATFORMS,
  type ContentDTO,
  type ContentPlatform,
} from "@/lib/content";

const PLATFORM_META: Record<
  ContentPlatform,
  { label: string; icon: LucideIcon }
> = {
  instagram: { label: "Instagram", icon: Instagram },
  tiktok: { label: "TikTok", icon: Music2 },
  x: { label: "X", icon: Hash },
  facebook: { label: "Facebook", icon: Facebook },
  email: { label: "Email", icon: Mail },
};

const TONES = [
  "Cercano y conversacional",
  "Profesional",
  "Divertido y desenfadado",
  "Inspirador",
  "Persuasivo y directo",
];

type ProductOption = { id: string; title: string };

type FormState = {
  topic: string;
  platforms: ContentPlatform[];
  tone: string;
  productId: string;
};

const EMPTY_FORM: FormState = {
  topic: "",
  platforms: ["instagram"],
  tone: TONES[0],
  productId: "",
};

export default function ContentStudioPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [generated, setGenerated] = useState<ContentDTO[]>([]);
  const [history, setHistory] = useState<ContentDTO[]>([]);
  const [filter, setFilter] = useState<ContentPlatform | "all">("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (!res.ok) return;
      const data: { id: string; title: string }[] = await res.json();
      setProducts(data.map((p) => ({ id: p.id, title: p.title })));
    } catch {
      // selector opcional; ignorar
    }
  }, []);

  const loadHistory = useCallback(async (platform: ContentPlatform | "all") => {
    setLoadingList(true);
    try {
      const url =
        platform === "all"
          ? "/api/content"
          : `/api/content?platform=${platform}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data: ContentDTO[] = await res.json();
      setHistory(data);
    } catch {
      // silencioso
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadHistory(filter);
  }, [filter, loadHistory]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function togglePlatform(p: ContentPlatform) {
    setForm((prev) => {
      const has = prev.platforms.includes(p);
      const platforms = has
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p];
      return { ...prev, platforms };
    });
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.platforms.length === 0) {
      setError("Selecciona al menos una plataforma.");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: form.topic,
          platforms: form.platforms,
          tone: form.tone,
          productId: form.productId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const issues = data?.issues
          ? Object.values(data.issues).flat().join(" ")
          : "";
        throw new Error(
          [data?.error, issues].filter(Boolean).join(" ") ||
            "Error al generar el contenido."
        );
      }
      setGenerated(data as ContentDTO[]);
      loadHistory(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Estudio de contenido</h1>
        <p className="text-muted-foreground">
          Genera contenido nativo para varias plataformas a partir de un tema.
        </p>
      </div>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Megaphone className="h-5 w-5 text-primary" />
            Nuevo contenido
          </CardTitle>
          <CardDescription>
            Define el tema, las plataformas y el tono.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="topic">Tema</Label>
              <Input
                id="topic"
                placeholder="Ej: 5 errores al empezar a invertir"
                value={form.topic}
                onChange={(e) => updateField("topic", e.target.value)}
                required
                minLength={2}
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label>Plataformas</Label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_PLATFORMS.map((p) => {
                  const meta = PLATFORM_META[p];
                  const Icon = meta.icon;
                  const active = form.platforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      disabled={isGenerating}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tone">Tono</Label>
                <select
                  id="tone"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.tone}
                  onChange={(e) => updateField("tone", e.target.value)}
                  disabled={isGenerating}
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product">Producto (opcional)</Label>
                <select
                  id="product"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.productId}
                  onChange={(e) => updateField("productId", e.target.value)}
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
                  Generar contenido
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

      {/* Resultado recién generado */}
      {generated.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Contenido generado</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {generated.map((piece) => (
              <ContentPieceCard key={piece.id} piece={piece} />
            ))}
          </div>
        </section>
      )}

      {/* Historial con filtro */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Contenido guardado</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadHistory(filter)}
            aria-label="Recargar"
          >
            <RefreshCw className={cn("h-4 w-4", loadingList && "animate-spin")} />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            Todas
          </FilterChip>
          {CONTENT_PLATFORMS.map((p) => (
            <FilterChip
              key={p}
              active={filter === p}
              onClick={() => setFilter(p)}
            >
              {PLATFORM_META[p].label}
            </FilterChip>
          ))}
        </div>

        {loadingList ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay contenido{filter !== "all" ? " para esta plataforma" : ""}.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {history.map((piece) => (
              <ContentPieceCard key={piece.id} piece={piece} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

function ContentPieceCard({ piece }: { piece: ContentDTO }) {
  const [copied, setCopied] = useState(false);
  const meta =
    PLATFORM_META[piece.platform as ContentPlatform] ?? {
      label: piece.platform,
      icon: Megaphone,
    };
  const Icon = meta.icon;

  async function copy() {
    const hashtagLine =
      piece.hashtags.length > 0
        ? "\n\n" + piece.hashtags.map((h) => `#${h}`).join(" ")
        : "";
    try {
      await navigator.clipboard.writeText(piece.body + hashtagLine);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard puede fallar sin https; ignorar
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <span className="font-medium">{meta.label}</span>
          <Badge variant="secondary">{piece.format}</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={copy} aria-label="Copiar">
          {copied ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {piece.body}
        </p>
        {piece.hashtags.length > 0 && (
          <p className="text-sm text-primary">
            {piece.hashtags.map((h) => `#${h}`).join(" ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
