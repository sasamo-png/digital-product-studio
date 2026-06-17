import "server-only";

import { z } from "zod";

import { generateStructured } from "./structured";

// ---------------------------------------------------------------------------
// Esquemas de entrada y salida (zod) — fuente de verdad de los tipos.
// ---------------------------------------------------------------------------

export const generateEbookInputSchema = z.object({
  title: z.string().trim().min(3, "El título debe tener al menos 3 caracteres").max(200),
  niche: z.string().trim().min(2, "El nicho es obligatorio").max(120),
  targetAudience: z
    .string()
    .trim()
    .min(2, "Describe el público objetivo")
    .max(400),
  writingStyle: z
    .string()
    .trim()
    .min(2, "Indica el estilo de escritura")
    .max(120),
});

export type GenerateEbookInput = z.infer<typeof generateEbookInputSchema>;

const outlineItemSchema = z.object({
  title: z.string(),
  summary: z.string(),
});

const chapterSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export const generateEbookOutputSchema = z.object({
  outline: z.array(outlineItemSchema).min(1),
  chapters: z.array(chapterSchema).min(1),
  coverBrief: z.string(),
  salesCopy: z.string(),
});

export type GenerateEbookOutput = z.infer<typeof generateEbookOutputSchema>;
export type EbookOutlineItem = z.infer<typeof outlineItemSchema>;
export type EbookChapter = z.infer<typeof chapterSchema>;

// ---------------------------------------------------------------------------
// JSON Schema para structured outputs de OpenAI (modo strict).
// Strict exige additionalProperties:false y que TODO sea required.
// Validamos de nuevo con zod tras parsear, por si el modelo se desvía.
// ---------------------------------------------------------------------------

const EBOOK_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    outline: {
      type: "array",
      description: "Índice del ebook: un elemento por capítulo.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", description: "Título del capítulo" },
          summary: {
            type: "string",
            description: "Resumen de 1-2 frases del capítulo",
          },
        },
        required: ["title", "summary"],
      },
    },
    chapters: {
      type: "array",
      description: "Capítulos completos, en el mismo orden que el outline.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", description: "Título del capítulo" },
          content: {
            type: "string",
            description:
              "Contenido completo del capítulo en markdown, varios párrafos.",
          },
        },
        required: ["title", "content"],
      },
    },
    coverBrief: {
      type: "string",
      description:
        "Brief visual para diseñar la portada: estilo, colores, elementos, mood.",
    },
    salesCopy: {
      type: "string",
      description:
        "Copy de venta persuasivo para la landing del ebook (markdown).",
    },
  },
  required: ["outline", "chapters", "coverBrief", "salesCopy"],
};

const SYSTEM_PROMPT = `Eres un autor y copywriter experto en productos digitales.
Generas ebooks completos, bien estructurados y listos para vender.
Escribe SIEMPRE en español. Devuelve contenido sustancioso y profesional,
no esquemático. Cada capítulo debe tener varios párrafos de contenido real.
Responde únicamente con el JSON solicitado.`;

function buildUserPrompt(input: GenerateEbookInput): string {
  return [
    `Crea un ebook con estos parámetros:`,
    `- Título: ${input.title}`,
    `- Nicho/tema: ${input.niche}`,
    `- Público objetivo: ${input.targetAudience}`,
    `- Estilo de escritura: ${input.writingStyle}`,
    ``,
    `Genera entre 5 y 8 capítulos. Para cada capítulo del "outline" debe existir`,
    `el capítulo correspondiente, en el mismo orden, dentro de "chapters".`,
    `Incluye además un "coverBrief" para la portada y un "salesCopy" de venta.`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Función principal: genera un ebook estructurado y validado.
// ---------------------------------------------------------------------------

export async function generateEbook(
  input: GenerateEbookInput
): Promise<GenerateEbookOutput> {
  // Validación de entrada (defensa en profundidad; la route ya valida también).
  const parsedInput = generateEbookInputSchema.parse(input);

  return generateStructured({
    schemaName: "ebook",
    jsonSchema: EBOOK_JSON_SCHEMA,
    outputSchema: generateEbookOutputSchema,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(parsedInput),
    temperature: 0.7,
  });
}
