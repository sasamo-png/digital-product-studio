import "server-only";

import OpenAI from "openai";

import { prisma } from "@/lib/prisma";

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
// Debe soportar structured outputs (json_schema).
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

// Modelo activo: preferencia persistida en Settings → env → default.
// Permite cambiar el modelo desde /settings sin reiniciar ni tocar código.
export async function getActiveModel(): Promise<string> {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
      select: { defaultModel: true },
    });
    if (settings?.defaultModel) return settings.defaultModel;
  } catch {
    // si falla la lectura, caemos al valor de entorno
  }
  return OPENAI_MODEL;
}
