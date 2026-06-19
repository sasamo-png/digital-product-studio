"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Loader2,
  Sparkles,
  AlertCircle,
  RefreshCw,
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { apiKeyHeaders, useApiKey } from "@/lib/use-api-key";
import { ApiKeyNotice } from "@/components/api-key-notice";
import { type EbookDTO } from "@/lib/ebooks";

const WRITING_STYLES = [
  "Cercano y conversacional",
  "Profesional y directo",
  "Inspirador y motivador",
  "Técnico y detallado",
  "Storytelling narrativo",
];

const STEPS = [
  "Generando el índice…",
  "Redactando los capítulos…",
  "Creando el copy de venta…",
];

type FormState = {
  title: string;
  niche: string;
  targetAudience: string;
  writingStyle: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  niche: "",
  targetAudience: "",
  writingStyle: WRITING_STYLES[0],
};

export default function EbookGeneratorPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [ebooks, setEbooks] = useState<EbookDTO[]>([]);
  const [selected, setSelected] = useState<EbookDTO | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const { hasKey } = useApiKey();

  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadEbooks = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/ebooks", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar la lista.");
      const data: EbookDTO[] = await res.json();
      setEbooks(data);
    } catch {
      // Silencioso en la lista; el error de generación se muestra arriba.
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadEbooks();
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
    };
  }, [loadEbooks]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startStepper() {
    setStep(0);
    stepTimer.current = setInterval(() => {
      setStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 4000);
  }

  function stopStepper() {
    if (stepTimer.current) {
      clearInterval(stepTimer.current);
      stepTimer.current = null;
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsGenerating(true);
    startStepper();

    try {
      const res = await fetch("/api/ebooks/generate", {
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
            "Error al generar el ebook."
        );
      }

      const created = data as EbookDTO;
      setEbooks((prev) => [created, ...prev]);
      setSelected(created);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      stopStepper();
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Generador de ebooks
        </h1>
        <p className="text-muted-foreground">
          Genera un ebook completo con IA: índice, capítulos, brief de portada y
          copy de venta.
        </p>
      </div>

      <ApiKeyNotice />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        {/* Columna izquierda: formulario + lista */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-primary" />
                Nuevo ebook
              </CardTitle>
              <CardDescription>
                Rellena los datos y deja que la IA haga el resto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    placeholder="Ej: Productividad sin estrés"
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    required
                    minLength={3}
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="niche">Nicho / tema</Label>
                  <Input
                    id="niche"
                    placeholder="Ej: hábitos y productividad personal"
                    value={form.niche}
                    onChange={(e) => updateField("niche", e.target.value)}
                    required
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audience">Público objetivo</Label>
                  <Textarea
                    id="audience"
                    placeholder="Ej: profesionales de 25-40 años que se sienten saturados"
                    value={form.targetAudience}
                    onChange={(e) =>
                      updateField("targetAudience", e.target.value)
                    }
                    required
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="style">Estilo de escritura</Label>
                  <select
                    id="style"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={form.writingStyle}
                    onChange={(e) =>
                      updateField("writingStyle", e.target.value)
                    }
                    disabled={isGenerating}
                  >
                    {WRITING_STYLES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
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
                      Generar ebook
                    </>
                  )}
                </Button>
              </form>

              {isGenerating && (
                <ol className="mt-6 space-y-2">
                  {STEPS.map((label, i) => (
                    <li
                      key={label}
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        i < step && "text-muted-foreground",
                        i === step && "font-medium text-foreground",
                        i > step && "text-muted-foreground/50"
                      )}
                    >
                      {i < step ? (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                          ✓
                        </span>
                      ) : i === step ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border" />
                      )}
                      {label}
                    </li>
                  ))}
                </ol>
              )}

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
              <CardTitle className="text-xl">Ebooks guardados</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={loadEbooks}
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
              ) : ebooks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay ebooks. Genera el primero arriba.
                </p>
              ) : (
                <ul className="space-y-2">
                  {ebooks.map((eb) => (
                    <li key={eb.id}>
                      <button
                        onClick={() => setSelected(eb)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent",
                          selected?.id === eb.id && "border-primary bg-accent"
                        )}
                      >
                        <BookOpen className="h-5 w-5 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {eb.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {eb.niche ?? "—"} · {eb.chapters.length} capítulos
                          </p>
                        </div>
                        <Badge variant="secondary">{eb.status}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: detalle */}
        <div>
          {selected ? (
            <EbookDetail ebook={selected} />
          ) : (
            <Card className="flex h-full min-h-[300px] items-center justify-center">
              <CardContent className="pt-6 text-center text-muted-foreground">
                <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">
                  Selecciona o genera un ebook para ver su contenido.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function EbookDetail({ ebook }: { ebook: EbookDTO }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-2xl">{ebook.title}</CardTitle>
          <Badge variant="secondary">{ebook.status}</Badge>
        </div>
        {ebook.niche && (
          <CardDescription>Nicho: {ebook.niche}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {ebook.salesCopy && (
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Copy de venta
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {ebook.salesCopy}
            </p>
          </section>
        )}

        {ebook.coverBrief && (
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Brief de portada
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {ebook.coverBrief}
            </p>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Capítulos ({ebook.chapters.length})
          </h3>
          {ebook.chapters.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin capítulos.</p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {ebook.chapters.map((ch, i) => (
                <AccordionItem key={i} value={`ch-${i}`}>
                  <AccordionTrigger>
                    <span>
                      {i + 1}. {ch.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {ch.content}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
