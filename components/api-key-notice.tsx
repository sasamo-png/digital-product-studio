"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";

import { useApiKey } from "@/lib/use-api-key";

// Aviso que se muestra en las páginas de generación cuando el usuario aún no ha
// configurado su API key. No bloquea el render, pero deja claro qué hacer.
export function ApiKeyNotice() {
  const { hasKey, loaded } = useApiKey();

  // No mostrar nada hasta saber el estado (evita parpadeo) ni si ya hay key.
  if (!loaded || hasKey) return null;

  return (
    <div className="flex items-start gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
      <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div>
        <p className="font-medium text-amber-700">
          Necesitas tu propia API key de OpenAI
        </p>
        <p className="text-amber-700/90">
          Para generar con IA, configura tu key en{" "}
          <Link href="/settings" className="font-medium underline">
            Ajustes
          </Link>
          . Se guarda solo en tu navegador y nunca se almacena en el servidor.
        </p>
      </div>
    </div>
  );
}
