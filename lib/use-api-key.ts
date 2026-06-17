"use client";

import { useCallback, useEffect, useState } from "react";

// Clave de almacenamiento en el navegador del usuario (BYOK).
const STORAGE_KEY = "dps.openai.key";
const EVENT = "dps-api-key-changed";

function readKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

// Cabeceras para las peticiones de generación. Vacío si no hay key.
export function apiKeyHeaders(): Record<string, string> {
  const key = readKey();
  return key ? { "x-openai-key": key } : {};
}

// Hook para leer/guardar/borrar la API key del usuario en localStorage.
// Se sincroniza entre componentes/pestañas mediante un evento.
export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setApiKeyState(readKey());
    setLoaded(true);
    const sync = () => setApiKeyState(readKey());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const saveApiKey = useCallback((value: string) => {
    const v = value.trim();
    try {
      if (v) window.localStorage.setItem(STORAGE_KEY, v);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage puede estar bloqueado; no es fatal.
    }
    setApiKeyState(v);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const clearApiKey = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setApiKeyState("");
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { apiKey, hasKey: apiKey.trim().length > 0, loaded, saveApiKey, clearApiKey };
}
