import "server-only";

import { z } from "zod";

import { generateStructured } from "./structured";

// ---------------------------------------------------------------------------
// Esquemas de entrada y salida (zod) — fuente de verdad de los tipos.
// ---------------------------------------------------------------------------

export const generateEbookInputSchema = z
  .object({
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
  })
  .strict();

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
Adapta de forma medible el registro y la longitud de frase al estilo indicado,
y el nivel de detalle y los ejemplos al público objetivo. No produzcas un texto
genérico: debe notarse que es para ESTE público y ESTE estilo.
Responde únicamente con el JSON solicitado.`;

function buildUserPrompt(input: GenerateEbookInput): string {
  return [
    `Crea un ebook con estos parámetros:`,
    `- Título: ${input.title}`,
    `- Nicho/tema: ${input.niche}`,
    `- Público objetivo: ${input.targetAudience}`,
    `- Estilo de escritura: ${input.writingStyle}`,
    ``,
    `Usa el número de capítulos que el tema realmente necesite (normalmente entre`,
    `5 y 10): ni los infles ni los recortes de forma artificial. Para cada capítulo`,
    `del "outline" debe existir el capítulo correspondiente, en el mismo orden,`,
    `dentro de "chapters". El contenido debe reflejar el estilo "${input.writingStyle}"`,
    `y hablar al público "${input.targetAudience}".`,
    `Incluye además un "coverBrief" para la portada y un "salesCopy" de venta.`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Función principal: genera un ebook estructurado y validado.
// ---------------------------------------------------------------------------

export async function generateEbook(
  input: GenerateEbookInput,
  apiKey: string
): Promise<GenerateEbookOutput> {
  // Validación de entrada (defensa en profundidad; la route ya valida también).
  const parsedInput = generateEbookInputSchema.parse(input);

  return generateStructured({
    apiKey,
    schemaName: "ebook",
    jsonSchema: EBOOK_JSON_SCHEMA,
    outputSchema: generateEbookOutputSchema,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(parsedInput),
    temperature: 0.7,
    // Salida larga (varios capítulos): damos margen amplio. Si aun así se agota,
    // structured.ts lo detecta vía finish_reason y lanza un error accionable.
    maxTokens: 16000,
  });
}
