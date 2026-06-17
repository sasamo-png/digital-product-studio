import "server-only";

import OpenAI from "openai";

import { prisma } from "@/lib/prisma";

// Cliente de OpenAI inicializado SOLO en el servidor. La API key se lee de
// process.env y nunca debe llegar al cliente ni a variables NEXT_PUBLIC_*.

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY no está configurada. Añádela a .env.local (lado servidor)."
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
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
