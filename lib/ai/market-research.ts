import "server-only";

import { z } from "zod";

import { generateStructured } from "./structured";

// ---------------------------------------------------------------------------
// Esquemas de entrada y salida (zod) — fuente de verdad de los tipos.
// ---------------------------------------------------------------------------

export const analyzeNicheInputSchema = z.object({
  niche: z.string().trim().min(2, "El nicho es obligatorio").max(160),
  notes: z.string().trim().max(1000).optional(),
});

export type AnalyzeNicheInput = z.infer<typeof analyzeNicheInputSchema>;

// Clamp resiliente: redondea y limita a 0-100 aunque el modelo se desvíe.
const score = z
  .number()
  .transform((n) => Math.max(0, Math.min(100, Math.round(n))));

const competitorSchema = z.object({
  name: z.string(),
  strength: z.string(),
  weakness: z.string(),
});

export const analyzeNicheOutputSchema = z.object({
  demandScore: score,
  competitionScore: score,
  profitScore: score,
  summary: z.string(),
  competitors: z.array(competitorSchema),
});

export type AnalyzeNicheOutput = z.infer<typeof analyzeNicheOutputSchema>;
export type NicheCompetitor = z.infer<typeof competitorSchema>;

// ---------------------------------------------------------------------------
// JSON Schema para structured outputs de OpenAI (modo strict).
// ---------------------------------------------------------------------------

const MARKET_RESEARCH_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    demandScore: {
      type: "integer",
      description: "Demanda del nicho de 0 a 100 (100 = altísima demanda).",
    },
    competitionScore: {
      type: "integer",
      description:
        "Nivel de competencia de 0 a 100 (100 = mercado muy saturado).",
    },
    profitScore: {
      type: "integer",
      description:
        "Potencial de rentabilidad de 0 a 100 (100 = muy rentable).",
    },
    summary: {
      type: "string",
      description:
        "Resumen ejecutivo del análisis del nicho (markdown, 1-3 párrafos).",
    },
    competitors: {
      type: "array",
      description: "Principales competidores o referentes del nicho.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "Nombre del competidor" },
          strength: {
            type: "string",
            description: "Su principal fortaleza",
          },
          weakness: {
            type: "string",
            description: "Su principal debilidad u oportunidad para entrar",
          },
        },
        required: ["name", "strength", "weakness"],
      },
    },
  },
  required: [
    "demandScore",
    "competitionScore",
    "profitScore",
    "summary",
    "competitors",
  ],
};

const SYSTEM_PROMPT = `Eres un analista de mercado experto en productos digitales.
Evalúas nichos con criterio realista y basado en señales de mercado.
Escribe SIEMPRE en español. Sé concreto y accionable. Da entre 3 y 6
competidores relevantes. Responde únicamente con el JSON solicitado.`;

function buildUserPrompt(input: AnalyzeNicheInput): string {
  return [
    `Analiza la viabilidad de este nicho para vender un producto digital:`,
    `- Nicho: ${input.niche}`,
    input.notes ? `- Notas / contexto adicional: ${input.notes}` : null,
    ``,
    `Devuelve scores de 0 a 100 para demanda, competencia y rentabilidad,`,
    `un resumen ejecutivo y una lista de competidores con su fortaleza y`,
    `debilidad principal.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Función principal: analiza un nicho y devuelve scores + competidores.
// ---------------------------------------------------------------------------

export async function analyzeNiche(
  input: AnalyzeNicheInput
): Promise<AnalyzeNicheOutput> {
  const parsedInput = analyzeNicheInputSchema.parse(input);

  return generateStructured({
    schemaName: "market_research",
    jsonSchema: MARKET_RESEARCH_JSON_SCHEMA,
    outputSchema: analyzeNicheOutputSchema,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(parsedInput),
    temperature: 0.4,
  });
}
