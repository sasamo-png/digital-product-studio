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
  // Tope de tokens de la respuesta. Útil en salidas largas (ebook) para evitar
  // truncados silenciosos; si se alcanza, se detecta vía finish_reason.
  maxTokens?: number;
  // Modelo a usar si el usuario no fijó uno en Ajustes. Por defecto, el de
  // entorno (OPENAI_MODEL). Las tareas de análisis pasan un modelo más capaz.
  modelFallback?: string;
};

// Wrapper común para llamadas al LLM con salida estructurada (JSON Schema strict)
// y validación zod. Centraliza el manejo de refusals, truncamiento, JSON inválido
// y parseo, para que cada módulo (ebook, market research, …) no duplique código.
export async function generateStructured<T>(args: StructuredArgs<T>): Promise<T> {
  const client = getOpenAIClient(args.apiKey);
  const model = await getActiveModel(args.modelFallback);

  const completion = await client.chat.completions.create({
    model,
    temperature: args.temperature ?? 0.7,
    ...(args.maxTokens ? { max_tokens: args.maxTokens } : {}),
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

  const choice = completion.choices[0];
  const message = choice?.message;

  // El modelo puede negarse (structured outputs expone `refusal`).
  if (message?.refusal) {
    throw new Error(`El modelo rechazó la petición: ${message.refusal}`);
  }

  // Respuesta cortada por límite de tokens: el JSON estará incompleto. Lo
  // distinguimos del "JSON inválido" genérico para que el error sea accionable.
  if (choice?.finish_reason === "length") {
    throw new Error(
      "La respuesta del modelo se cortó por longitud. Reduce el alcance o usa un límite de tokens mayor."
    );
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
  // Si falla, logueamos el detalle en servidor (para auditar por qué el modelo
  // se desvió) pero devolvemos un mensaje genérico sin volcar la respuesta.
  const result = args.outputSchema.safeParse(json);
  if (!result.success) {
    console.error(
      `[structured:${args.schemaName}] salida del modelo inválida:`,
      result.error.issues
    );
    throw new Error("El modelo devolvió datos con un formato inesperado.");
  }
  return result.data;
}
