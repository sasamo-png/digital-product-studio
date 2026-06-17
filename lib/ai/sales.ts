import "server-only";

import { z } from "zod";

import { generateStructured } from "./structured";
import { salesChannelSchema, type SalesChannel } from "@/lib/sales";

export type { SalesChannel };

// ---------------------------------------------------------------------------
// Esquemas de entrada y salida (zod).
// ---------------------------------------------------------------------------

export const generateSalesScriptsInputSchema = z.object({
  productId: z.string().trim().min(1).optional(),
  scenario: z
    .string()
    .trim()
    .min(2, "Describe el escenario de venta")
    .max(500),
  channel: salesChannelSchema,
  // Contexto del producto (lo inyecta la route si hay productId).
  productContext: z.string().max(2000).optional(),
});

export type GenerateSalesScriptsInput = z.infer<
  typeof generateSalesScriptsInputSchema
>;

const objectionHandlerSchema = z.object({
  objection: z.string(),
  response: z.string(),
});

export const generateSalesScriptsOutputSchema = z.object({
  dmScripts: z.array(z.string()).min(1),
  objectionHandlers: z.array(objectionHandlerSchema).min(1),
  closingScripts: z.array(z.string()).min(1),
});

export type GenerateSalesScriptsOutput = z.infer<
  typeof generateSalesScriptsOutputSchema
>;
export type ObjectionHandler = z.infer<typeof objectionHandlerSchema>;

// ---------------------------------------------------------------------------
// JSON Schema para structured outputs (modo strict).
// ---------------------------------------------------------------------------

const SALES_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    dmScripts: {
      type: "array",
      description: "Mensajes de apertura / scripts de contacto inicial.",
      items: { type: "string" },
    },
    objectionHandlers: {
      type: "array",
      description: "Objeciones frecuentes y cómo responderlas.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          objection: { type: "string" },
          response: { type: "string" },
        },
        required: ["objection", "response"],
      },
    },
    closingScripts: {
      type: "array",
      description: "Scripts de cierre para concretar la venta.",
      items: { type: "string" },
    },
  },
  required: ["dmScripts", "objectionHandlers", "closingScripts"],
};

const SYSTEM_PROMPT = `Eres un experto en ventas consultivas de productos digitales.
Escribes scripts naturales, empáticos y persuasivos, nunca agresivos.
Escribe SIEMPRE en español. Adapta el tono al canal indicado.
Responde únicamente con el JSON solicitado.`;

function buildUserPrompt(input: GenerateSalesScriptsInput): string {
  return [
    `Genera material de ventas para este caso:`,
    input.productContext ? `Producto: ${input.productContext}` : null,
    `Escenario: ${input.scenario}`,
    `Canal: ${input.channel}`,
    ``,
    `Devuelve: 3-5 scripts de apertura (dmScripts), 4-6 manejos de objeciones`,
    `(objectionHandlers) y 3-4 scripts de cierre (closingScripts).`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Función principal.
// ---------------------------------------------------------------------------

export async function generateSalesScripts(
  input: GenerateSalesScriptsInput
): Promise<GenerateSalesScriptsOutput> {
  const parsedInput = generateSalesScriptsInputSchema.parse(input);

  return generateStructured({
    schemaName: "sales_scripts",
    jsonSchema: SALES_JSON_SCHEMA,
    outputSchema: generateSalesScriptsOutputSchema,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(parsedInput),
    temperature: 0.7,
  });
}
