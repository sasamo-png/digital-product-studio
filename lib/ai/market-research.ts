import "server-only";

import { z } from "zod";

import { generateStructured } from "./structured";
import { ANALYSIS_MODEL } from "@/lib/models";

// ---------------------------------------------------------------------------
// Esquemas de entrada y salida (zod) — fuente de verdad de los tipos.
// ---------------------------------------------------------------------------

export const analyzeNicheInputSchema = z
  .object({
    niche: z.string().trim().min(2, "El nicho es obligatorio").max(160),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

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

// El orden de las propiedades importa: con structured outputs el modelo genera
// los campos EN ORDEN, así que pedimos primero la justificación (rationale) y
// DESPUÉS la nota. Esto fuerza un razonamiento previo y rompe la tendencia del
// modelo a devolver siempre el mismo valor "seguro" (~70) para cualquier nicho.
export const analyzeNicheOutputSchema = z.object({
  demandRationale: z.string(),
  demandScore: score,
  competitionRationale: z.string(),
  competitionScore: score,
  profitRationale: z.string(),
  profitScore: score,
  summary: z.string(),
  competitors: z.array(competitorSchema).min(1),
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
    demandRationale: {
      type: "string",
      description:
        "Justificación breve (1-2 frases) de la nota de DEMANDA, basada en señales concretas del nicho (búsquedas, tamaño de audiencia, urgencia del problema, estacionalidad).",
    },
    demandScore: {
      type: "integer",
      description:
        "Demanda del nicho de 0 a 100 (100 = altísima demanda). Deriva de demandRationale. Usa el rango completo con precisión; evita valores por defecto redondos.",
    },
    competitionRationale: {
      type: "string",
      description:
        "Justificación breve (1-2 frases) de la nota de COMPETENCIA: cuántos referentes hay, qué tan fuertes y qué huecos quedan.",
    },
    competitionScore: {
      type: "integer",
      description:
        "Nivel de competencia de 0 a 100 (100 = mercado muy saturado). Deriva de competitionRationale.",
    },
    profitRationale: {
      type: "string",
      description:
        "Justificación breve (1-2 frases) de la nota de RENTABILIDAD: disposición a pagar, precio típico, coste de adquisición, recurrencia.",
    },
    profitScore: {
      type: "integer",
      description:
        "Potencial de rentabilidad de 0 a 100 (100 = muy rentable). Deriva de profitRationale.",
    },
    summary: {
      type: "string",
      description:
        "Resumen ejecutivo y accionable del análisis del nicho (markdown, 1-3 párrafos), específico de ESTE nicho.",
    },
    competitors: {
      type: "array",
      description:
        "Competidores o referentes REALES que existan para este nicho concreto. La cantidad depende del mercado (pueden ser 2 o 9): no rellenes con genéricos ni inventes nombres.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "Nombre del competidor real" },
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
    "demandRationale",
    "demandScore",
    "competitionRationale",
    "competitionScore",
    "profitRationale",
    "profitScore",
    "summary",
    "competitors",
  ],
};

const SYSTEM_PROMPT = `Eres un analista de mercado experto en productos digitales.
Evalúas nichos con criterio realista y basado en señales de mercado, y eres
honesto: muchos nichos NO son buenas oportunidades.

Reglas innegociables:
- Razona ANTES de puntuar: cada nota va precedida de su justificación.
- Las notas deben reflejar las diferencias REALES entre nichos. PROHIBIDO usar
  valores por defecto: no devuelvas siempre 70, ni te ancles a múltiplos de 10
  (50, 60, 70, 80). Usa todo el rango 0-100 con precisión (p. ej. 37, 63, 82).
- Si un nicho es pequeño, baja la demanda; si está saturado, sube la competencia;
  si la disposición a pagar es baja, baja la rentabilidad. Diferéncialos.
- Los competidores deben ser REALES y específicos de este nicho; su número
  depende del mercado, no de una cuota fija. No inventes ni rellenes.
- Escribe SIEMPRE en español. Sé concreto y accionable.
- Responde únicamente con el JSON solicitado, sin texto adicional.`;

function buildUserPrompt(input: AnalyzeNicheInput): string {
  return [
    `Analiza la viabilidad de este nicho concreto para vender un producto digital.`,
    `Tu análisis debe ser específico de este nicho; no devuelvas una respuesta plantilla.`,
    ``,
    `- Nicho: ${input.niche}`,
    input.notes ? `- Notas / contexto adicional: ${input.notes}` : null,
    ``,
    `Para cada dimensión (demanda, competencia, rentabilidad): primero escribe la`,
    `justificación basada en señales del nicho y DESPUÉS la nota 0-100 derivada de`,
    `esa justificación. Añade un resumen ejecutivo y la lista de competidores`,
    `reales con su fortaleza y debilidad principal.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Función principal: analiza un nicho y devuelve scores + competidores.
// ---------------------------------------------------------------------------

export async function analyzeNiche(
  input: AnalyzeNicheInput,
  apiKey: string
): Promise<AnalyzeNicheOutput> {
  const parsedInput = analyzeNicheInputSchema.parse(input);

  return generateStructured({
    apiKey,
    schemaName: "market_research",
    jsonSchema: MARKET_RESEARCH_JSON_SCHEMA,
    outputSchema: analyzeNicheOutputSchema,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(parsedInput),
    // El scoring es una tarea de razonamiento: usa por defecto un modelo más
    // capaz (gpt-4o) salvo que el usuario haya fijado otro en Ajustes.
    modelFallback: ANALYSIS_MODEL,
    temperature: 0.5,
  });
}
