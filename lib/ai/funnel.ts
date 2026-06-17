import "server-only";

import { z } from "zod";

import { generateStructured } from "./structured";

// ---------------------------------------------------------------------------
// Esquemas de entrada y salida (zod).
// ---------------------------------------------------------------------------

export const generateFunnelInputSchema = z.object({
  productId: z.string().trim().min(1, "El producto es obligatorio"),
  goal: z.string().trim().min(2, "Indica el objetivo del embudo").max(300),
  audience: z.string().trim().min(2, "Describe la audiencia").max(400),
  // Contexto del producto (lo inyecta la route desde la BD para enriquecer el prompt).
  productContext: z.string().max(2000).optional(),
});

export type GenerateFunnelInput = z.infer<typeof generateFunnelInputSchema>;

const landingPageSchema = z.object({
  headline: z.string(),
  subheadline: z.string(),
  bullets: z.array(z.string()),
  cta: z.string(),
});

const salesSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
});

const emailSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

const upsellSchema = z.object({
  name: z.string(),
  description: z.string(),
});

export const generateFunnelOutputSchema = z.object({
  landingPage: landingPageSchema,
  salesPage: z.object({ sections: z.array(salesSectionSchema).min(1) }),
  emailSequence: z.array(emailSchema).min(1),
  upsells: z.array(upsellSchema),
});

export type GenerateFunnelOutput = z.infer<typeof generateFunnelOutputSchema>;
export type FunnelLandingPage = z.infer<typeof landingPageSchema>;
export type FunnelSalesSection = z.infer<typeof salesSectionSchema>;
export type FunnelEmail = z.infer<typeof emailSchema>;
export type FunnelUpsell = z.infer<typeof upsellSchema>;

// ---------------------------------------------------------------------------
// JSON Schema para structured outputs (modo strict).
// ---------------------------------------------------------------------------

const FUNNEL_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    landingPage: {
      type: "object",
      additionalProperties: false,
      properties: {
        headline: { type: "string" },
        subheadline: { type: "string" },
        bullets: { type: "array", items: { type: "string" } },
        cta: { type: "string", description: "Texto del botón de llamada a la acción" },
      },
      required: ["headline", "subheadline", "bullets", "cta"],
    },
    salesPage: {
      type: "object",
      additionalProperties: false,
      properties: {
        sections: {
          type: "array",
          description: "Secciones de la página de ventas (problema, solución, prueba social, oferta, garantía…).",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              content: { type: "string" },
            },
            required: ["title", "content"],
          },
        },
      },
      required: ["sections"],
    },
    emailSequence: {
      type: "array",
      description: "Secuencia de 5 a 7 emails de venta.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          subject: { type: "string" },
          body: { type: "string" },
        },
        required: ["subject", "body"],
      },
    },
    upsells: {
      type: "array",
      description: "Ofertas complementarias / upsells.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          description: { type: "string" },
        },
        required: ["name", "description"],
      },
    },
  },
  required: ["landingPage", "salesPage", "emailSequence", "upsells"],
};

const SYSTEM_PROMPT = `Eres un experto en marketing de respuesta directa y embudos de
venta para productos digitales. Diseñas embudos completos y persuasivos.
Escribe SIEMPRE en español. La secuencia de emails debe tener entre 5 y 7 correos.
Responde únicamente con el JSON solicitado.`;

function buildUserPrompt(input: GenerateFunnelInput): string {
  return [
    `Diseña un embudo de venta completo.`,
    input.productContext ? `Producto: ${input.productContext}` : null,
    `Objetivo del embudo: ${input.goal}`,
    `Audiencia: ${input.audience}`,
    ``,
    `Incluye: landing page (headline, subheadline, bullets, CTA),`,
    `página de ventas por secciones, secuencia de 5-7 emails y upsells.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Función principal.
// ---------------------------------------------------------------------------

export async function generateFunnel(
  input: GenerateFunnelInput,
  apiKey: string
): Promise<GenerateFunnelOutput> {
  const parsedInput = generateFunnelInputSchema.parse(input);

  return generateStructured({
    apiKey,
    schemaName: "funnel",
    jsonSchema: FUNNEL_JSON_SCHEMA,
    outputSchema: generateFunnelOutputSchema,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(parsedInput),
    temperature: 0.7,
  });
}
