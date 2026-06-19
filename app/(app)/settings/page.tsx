"use client";

import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  Loader2,
  AlertCircle,
  Check,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  Trash2,
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
import { useApiKey } from "@/lib/use-api-key";
import type { SettingsDTO } from "@/lib/settings";
import { SUPPORTED_MODELS } from "@/lib/models";

// Opciones de modelo para la UI (fuente única en lib/models.ts).
const MODEL_OPTIONS = SUPPORTED_MODELS;

const TONE_OPTIONS = [
  "Cercano y conversacional",
  "Profesional",
  "Divertido y desenfadado",
  "Inspirador",
  "Persuasivo y directo",
];

export default function SettingsPage() {
  // --- Preferencias (servidor) ---
  const [form, setForm] = useState<SettingsDTO>({
    defaultModel: null,
    defaultTone: null,
    brandName: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // --- API key del usuario (navegador, BYOK) ---
  const { apiKey, saveApiKey, clearApiKey } = useApiKey();
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [keyMsg, setKeyMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  useEffect(() => {
    setKeyInput(apiKey);
  }, [apiKey]);

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

  function handleSaveKey() {
    saveApiKey(keyInput);
    setKeyMsg({ ok: true, text: "Key guardada en este navegador." });
  }

  function handleClearKey() {
    clearApiKey();
    setKeyInput("");
    setKeyMsg({ ok: true, text: "Key eliminada de este navegador." });
  }

  async function handleTestKey() {
    const k = keyInput.trim();
    if (!k) {
      setKeyMsg({ ok: false, text: "Introduce una key primero." });
      return;
    }
    setTesting(true);
    setKeyMsg(null);
    try {
      const res = await fetch("/api/ai/validate", {
        method: "POST",
        headers: { "x-openai-key": k },
      });
      const json = await res.json();
      if (res.ok && json.valid) {
        saveApiKey(k); // si es válida, la guardamos
        setKeyMsg({ ok: true, text: "Key válida y guardada ✓" });
      } else {
        setKeyMsg({ ok: false, text: json?.error || "Key no válida." });
      }
    } catch {
      setKeyMsg({ ok: false, text: "No se pudo verificar la key." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground">
          Tu API key y las preferencias por defecto de la plataforma.
        </p>
      </div>

      {/* Aviso de conexión sin cifrar */}
      <div className="flex items-start gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-amber-700">
          Esta demo se sirve por <strong>HTTP sin cifrar</strong>. Úsala solo para
          pruebas y, preferiblemente, con una API key con{" "}
          <strong>límite de gasto bajo</strong>. No introduzcas claves críticas de
          producción hasta que haya HTTPS.
        </p>
      </div>

      {/* --- Card: Tu API Key (BYOK) --- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <KeyRound className="h-5 w-5 text-primary" />
            Tu API Key de OpenAI
          </CardTitle>
          <CardDescription>
            Cada persona usa su propia key. Se guarda <strong>solo en tu
            navegador</strong> y se usa al vuelo en el servidor; nunca se almacena.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key (empieza por sk-…)</Label>
            <div className="flex gap-2">
              <Input
                id="apiKey"
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                autoComplete="off"
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setKeyMsg(null);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowKey((s) => !s)}
                aria-label={showKey ? "Ocultar" : "Mostrar"}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSaveKey} disabled={testing}>
              Guardar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTestKey}
              disabled={testing}
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Probando…
                </>
              ) : (
                "Probar key"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearKey}
              disabled={testing}
            >
              <Trash2 className="h-4 w-4" />
              Borrar
            </Button>
          </div>

          {keyMsg && (
            <p
              className={
                keyMsg.ok
                  ? "text-sm text-emerald-600"
                  : "text-sm text-destructive"
              }
            >
              {keyMsg.text}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            ¿No tienes key? Crea una en{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              platform.openai.com/api-keys
            </a>
            . El consumo se cobra a tu propia cuenta de OpenAI.
          </p>
        </CardContent>
      </Card>

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
                  Modelo que se usará en las generaciones (con la key de cada
                  usuario).
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

          {/* Cómo se trata tu API key */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                Privacidad de tu API key
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Tu key se guarda únicamente en el{" "}
              <strong>almacenamiento local de tu navegador</strong>. Se envía al
              servidor solo durante cada generación, se usa al instante y{" "}
              <strong>no se almacena ni se registra</strong> en el servidor, la base
              de datos ni en commits. Borrarla aquí la elimina de tu navegador.
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
