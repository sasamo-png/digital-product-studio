import "server-only";

import type { z } from "zod";

import { getOpenAIClient, getActiveModel } from "./openai";

type StructuredArgs<T> = {
  // API key del usuario (BYOK). Obligatoria.
  apiKey: string;
  // Nombre del schema (requerido por la API de OpenAI).
  schemaName: string;
  // JSON Schema para structured outputs (modo strict).
  jsonSchema: Record<string, unknown>;
  // Schema zod para validar/parsear la salida (fuente de verdad del tipo).
  outputSchema: z.ZodType<T>;
  system: string;
  user: string;
  temperature?: number;
};

// Wrapper común para llamadas al LLM con salida estructurada (JSON Schema strict)
// y validación zod. Centraliza el manejo de refusals, JSON inválido y parseo,
// para que cada módulo (ebook, market research, …) no duplique este código.
export async function generateStructured<T>(args: StructuredArgs<T>): Promise<T> {
  const client = getOpenAIClient(args.apiKey);
  const model = await getActiveModel();

  const completion = await client.chat.completions.create({
    model,
    temperature: args.temperature ?? 0.7,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: args.schemaName,
        strict: true,
        schema: args.jsonSchema,
      },
    },
  });

  const message = completion.choices[0]?.message;

  // El modelo puede negarse (structured outputs expone `refusal`).
  if (message?.refusal) {
    throw new Error(`El modelo rechazó la petición: ${message.refusal}`);
  }

  const raw = message?.content;
  if (!raw) {
    throw new Error("La API de OpenAI no devolvió contenido.");
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("La respuesta del modelo no es JSON válido.");
  }

  // Validación de salida: garantiza que el objeto cumple el contrato tipado.
  return args.outputSchema.parse(json);
}
