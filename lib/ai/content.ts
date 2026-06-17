import "server-only";

import { z } from "zod";

import { generateStructured } from "./structured";
import {
  CONTENT_PLATFORMS,
  contentPlatformSchema,
  type ContentPlatform,
} from "@/lib/content";

export type { ContentPlatform };

// ---------------------------------------------------------------------------
// Esquemas de entrada y salida (zod) — fuente de verdad de los tipos.
// ---------------------------------------------------------------------------

export const generateContentInputSchema = z.object({
  topic: z.string().trim().min(2, "El tema es obligatorio").max(300),
  platforms: z
    .array(contentPlatformSchema)
    .min(1, "Selecciona al menos una plataforma"),
  tone: z.string().trim().min(2, "Indica el tono").max(80),
  productId: z.string().trim().min(1).optional(),
});

export type GenerateContentInput = z.infer<typeof generateContentInputSchema>;

const contentPieceSchema = z.object({
  // El JSON Schema strict (enum) ya garantiza una de las claves exactas.
  platform: contentPlatformSchema,
  format: z.string(),
  body: z.string(),
  hashtags: z.array(z.string()),
});

export const generateContentOutputSchema = z.object({
  pieces: z.array(contentPieceSchema).min(1),
});

export type ContentPiece = z.infer<typeof contentPieceSchema>;

// ---------------------------------------------------------------------------
// JSON Schema para structured outputs de OpenAI (modo strict).
// En strict todo es required; hashtags es array (vacío cuando no aplique, p.ej. email).
// ---------------------------------------------------------------------------

const CONTENT_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    pieces: {
      type: "array",
      description: "Una pieza de contenido por cada plataforma solicitada.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          platform: {
            type: "string",
            enum: [...CONTENT_PLATFORMS],
            description: "Plataforma destino (clave exacta).",
          },
          format: {
            type: "string",
            description:
              "Formato adecuado a la plataforma (post, reel, guion, hilo, newsletter…).",
          },
          body: {
            type: "string",
            description: "Texto completo de la pieza, listo para publicar.",
          },
          hashtags: {
            type: "array",
            description:
              "Hashtags relevantes (sin #). Vacío cuando no apliquen (p.ej. email).",
            items: { type: "string" },
          },
        },
        required: ["platform", "format", "body", "hashtags"],
      },
    },
  },
  required: ["pieces"],
};

const SYSTEM_PROMPT = `Eres un estratega de contenido y copywriter de redes sociales.
Creas contenido nativo y optimizado para cada plataforma. Escribe SIEMPRE en
español. Adapta longitud, formato y estilo a cada red. Para email no uses
hashtags. Responde únicamente con el JSON solicitado.`;

function buildUserPrompt(input: GenerateContentInput): string {
  return [
    `Crea contenido sobre este tema: ${input.topic}`,
    `Tono: ${input.tone}`,
    `Genera EXACTAMENTE una pieza para cada una de estas plataformas: ${input.platforms.join(
      ", "
    )}.`,
    `Usa la clave exacta de plataforma en cada pieza.`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Función principal: genera piezas de contenido multiplataforma.
// ---------------------------------------------------------------------------

export async function generateContent(
  input: GenerateContentInput
): Promise<ContentPiece[]> {
  const parsedInput = generateContentInputSchema.parse(input);

  const result = await generateStructured({
    schemaName: "content",
    jsonSchema: CONTENT_JSON_SCHEMA,
    outputSchema: generateContentOutputSchema,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(parsedInput),
    temperature: 0.8,
  });

  return result.pieces;
}
