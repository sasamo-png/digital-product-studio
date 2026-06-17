import "server-only";

import { prisma } from "@/lib/prisma";

export const SETTINGS_ID = "default";

// Modelos OpenAI sugeridos en la UI (todos soportan structured outputs).
export const SUGGESTED_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1",
] as const;

// DTO expuesto al cliente. NUNCA incluye secretos (la API key vive solo en env).
export type SettingsDTO = {
  defaultModel: string | null;
  defaultTone: string | null;
  brandName: string | null;
};

export async function getSettings(): Promise<SettingsDTO> {
  const s = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  return {
    defaultModel: s?.defaultModel ?? null,
    defaultTone: s?.defaultTone ?? null,
    brandName: s?.brandName ?? null,
  };
}

export async function updateSettings(
  data: Partial<SettingsDTO>
): Promise<SettingsDTO> {
  const clean = {
    defaultModel: data.defaultModel || null,
    defaultTone: data.defaultTone || null,
    brandName: data.brandName || null,
  };
  const s = await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...clean },
    update: clean,
  });
  return {
    defaultModel: s.defaultModel,
    defaultTone: s.defaultTone,
    brandName: s.brandName,
  };
}
