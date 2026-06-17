"use client";

import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  Loader2,
  AlertCircle,
  Check,
  ShieldCheck,
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
import type { SettingsDTO } from "@/lib/settings";

// Opciones de modelo para la UI (todas soportan structured outputs).
// Se define aquí (no en lib/settings, que es server-only) para no arrastrar
// código de servidor al bundle del cliente.
const MODEL_OPTIONS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"];

const TONE_OPTIONS = [
  "Cercano y conversacional",
  "Profesional",
  "Divertido y desenfadado",
  "Inspirador",
  "Persuasivo y directo",
];

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsDTO>({
    defaultModel: null,
    defaultTone: null,
    brandName: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Error al cargar.");
        setForm({
          defaultModel: json.defaultModel ?? "",
          defaultTone: json.defaultTone ?? "",
          brandName: json.brandName ?? "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error al guardar.");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground">
          Preferencias por defecto de la plataforma.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando preferencias…</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <SettingsIcon className="h-5 w-5 text-primary" />
                Preferencias
              </CardTitle>
              <CardDescription>
                Se guardan en la base de datos y se aplican en toda la app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brandName">Nombre de marca</Label>
                <Input
                  id="brandName"
                  placeholder="Ej: Mi Academia Digital"
                  value={form.brandName ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, brandName: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultModel">Modelo de IA por defecto</Label>
                <select
                  id="defaultModel"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.defaultModel ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, defaultModel: e.target.value }))
                  }
                  disabled={saving}
                >
                  <option value="">— Usar el de entorno (OPENAI_MODEL) —</option>
                  {MODEL_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Sustituye a la variable OPENAI_MODEL para las generaciones con IA.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultTone">Tono de marca por defecto</Label>
                <select
                  id="defaultTone"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.defaultTone ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, defaultTone: e.target.value }))
                  }
                  disabled={saving}
                >
                  <option value="">— Sin preferencia —</option>
                  {TONE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Seguridad: la API key nunca se gestiona desde la UI */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                Seguridad de la API key
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              La API key de OpenAI vive exclusivamente en{" "}
              <code className="rounded bg-muted px-1 py-0.5">.env.local</code> del
              servidor. No se muestra, no se pide y no se almacena en la base de
              datos ni en el cliente. Para cambiarla, edita el archivo de entorno y
              reinicia el servidor.
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando…
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4" />
                Guardado
              </>
            ) : (
              "Guardar preferencias"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
