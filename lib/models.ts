// Fuente única de modelos OpenAI soportados. Módulo SIN `server-only` para que
// lo compartan el cliente (selector en /settings) y el servidor (validación de
// la preferencia y elección del modelo activo). Todos soportan structured
// outputs (json_schema, modo strict).

export const SUPPORTED_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1",
] as const;

export type SupportedModel = (typeof SUPPORTED_MODELS)[number];

// Modelo por defecto para generación de texto (barato y rápido).
export const DEFAULT_MODEL: SupportedModel = "gpt-4o-mini";

// Modelo por defecto para tareas de ANÁLISIS / scoring (mejor razonamiento y
// discriminación entre nichos). Lo usa la investigación de mercado salvo que el
// usuario haya fijado un modelo concreto en Ajustes.
export const ANALYSIS_MODEL: SupportedModel = "gpt-4o";

export function isSupportedModel(model: string): model is SupportedModel {
  return (SUPPORTED_MODELS as readonly string[]).includes(model);
}
