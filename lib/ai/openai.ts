import "server-only";

import OpenAI from "openai";

import { prisma } from "@/lib/prisma";
import { DEFAULT_MODEL, isSupportedModel } from "@/lib/models";

// Error tipado para que las routes distingan "falta la key del usuario".
export class MissingApiKeyError extends Error {
  constructor() {
    super("Falta tu API key de OpenAI.");
    this.name = "MissingApiKeyError";
  }
}

// BYOK (Bring Your Own Key): la API key la aporta el usuario en cada petición
// (cabecera x-openai-key). NUNCA se lee de variables de entorno ni se persiste:
// se crea un cliente nuevo, de usar y tirar, por llamada.
export function getOpenAIClient(apiKey: string): OpenAI {
  const key = apiKey?.trim();
  if (!key) {
    throw new MissingApiKeyError();
  }
  return new OpenAI({ apiKey: key });
}

// Modelo configurable por entorno para poder cambiarlo sin tocar código.
// Debe soportar structured outputs (json_schema). Si el valor del entorno no
// está en la allowlist (modelo inexistente o sin soporte de json_schema strict),
// cae a DEFAULT_MODEL para no romper TODAS las generaciones.
export const OPENAI_MODEL: string = isSupportedModel(process.env.OPENAI_MODEL ?? "")
  ? (process.env.OPENAI_MODEL as string)
  : DEFAULT_MODEL;

// Modelo activo: preferencia persistida en Settings → fallback de la tarea.
// La preferencia solo se usa si es un modelo soportado (allowlist); un valor
// arbitrario en Settings haría fallar TODAS las generaciones, así que se ignora
// y se cae al fallback. `fallback` por defecto es OPENAI_MODEL (env), pero las
// tareas de análisis pueden pasar un modelo más capaz (ver ANALYSIS_MODEL).
export async function getActiveModel(fallback: string = OPENAI_MODEL): Promise<string> {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
      select: { defaultModel: true },
    });
    if (settings?.defaultModel && isSupportedModel(settings.defaultModel)) {
      return settings.defaultModel;
    }
  } catch {
    // si falla la lectura, caemos al fallback
  }
  return fallback;
}
