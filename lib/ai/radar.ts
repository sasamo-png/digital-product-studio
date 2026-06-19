import "server-only";

import { z } from "zod";

import { DEFAULT_MODEL } from "@/lib/models";
import { generateStructured } from "./structured";

// Clasificación de nicho del Radar con structured outputs (BYOK).
export const radarNicheOutputSchema = z.object({
  niche: z.string(),
  angle: z.string(),
});
export type RadarNiche = z.infer<typeof radarNicheOutputSchema>;

const RADAR_NICHE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["niche", "angle"],
  properties: {
    niche: {
      type: "string",
      description:
        "Nicho de mercado en español, conciso (2-4 palabras). Ej: 'suplementos para el dolor', 'cursos de trading', 'estética facial'.",
    },
    angle: {
      type: "string",
      description:
        "Ángulo o promesa dominante de las ofertas, en una sola frase corta en español.",
    },
  },
} as const;

// Identifica nicho + ángulo a partir de los textos de los anuncios capturados.
export async function classifyRadarNiche(
  input: { country: string; pageName: string; samples: string[] },
  apiKey: string
): Promise<RadarNiche> {
  const samples = input.samples
    .map((s, i) => `${i + 1}. ${s.replace(/\s+/g, " ").slice(0, 300)}`)
    .join("\n");

  return generateStructured({
    apiKey,
    schemaName: "radar_niche",
    jsonSchema: RADAR_NICHE_JSON_SCHEMA as unknown as Record<string, unknown>,
    outputSchema: radarNicheOutputSchema,
    system:
      "Eres un analista de marketing de respuesta directa. A partir de textos de anuncios activos de la Biblioteca de Anuncios de Meta, identificas el nicho de mercado y el ángulo/promesa dominante. Respondes siempre en español, de forma concisa y concreta.",
    user: `País: ${input.country}\nAnunciante destacado: ${input.pageName}\n\nTextos de anuncios:\n${samples}`,
    temperature: 0.2,
    maxTokens: 200,
    modelFallback: DEFAULT_MODEL,
  });
}
