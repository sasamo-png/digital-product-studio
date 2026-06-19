import "server-only";

import { prisma } from "@/lib/prisma";

export const SETTINGS_ID = "default";

// Modelos soportados: ver la fuente única en lib/models.ts (SUPPORTED_MODELS).

// DTO expuesto al cliente. NUNCA incluye secretos. La API key es BYOK: vive solo
// en el navegador del usuario, nunca en el servidor ni en esta tabla.
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
