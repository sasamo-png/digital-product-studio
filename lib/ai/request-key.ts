import "server-only";

import { NextResponse } from "next/server";

import { MissingApiKeyError } from "./openai";

// Extrae la API key del usuario de la cabecera de la petición (BYOK).
// Lanza MissingApiKeyError si no viene.
export function getUserApiKey(request: Request): string {
  const key = request.headers.get("x-openai-key")?.trim();
  if (!key) throw new MissingApiKeyError();
  return key;
}

type ApiErrorLike = { status?: number };

// Convierte errores de generación en respuestas HTTP claras y accionables.
// NUNCA incluye la API key en el mensaje.
export function aiErrorResponse(err: unknown): NextResponse {
  if (err instanceof MissingApiKeyError) {
    return NextResponse.json(
      {
        error: "Falta tu API key de OpenAI. Configúrala en Ajustes.",
        code: "NO_API_KEY",
      },
      { status: 400 }
    );
  }

  const message = err instanceof Error ? err.message : "Error desconocido.";
  const status = (err as ApiErrorLike)?.status;

  if (status === 401 || /invalid.*api key|incorrect api key|unauthorized/i.test(message)) {
    return NextResponse.json(
      { error: "API key inválida. Revísala en Ajustes.", code: "INVALID_API_KEY" },
      { status: 401 }
    );
  }

  if (status === 429 || /quota|rate limit/i.test(message)) {
    return NextResponse.json(
      {
        error: "Límite o cuota de OpenAI alcanzado para tu key.",
        code: "RATE_LIMIT",
      },
      { status: 429 }
    );
  }

  // No reenviamos `message` crudo al cliente (puede traer detalles internos del
  // proveedor o de Prisma). El detalle ya se loguea en cada route.
  console.error("[ai] error de generación:", message);
  return NextResponse.json(
    { error: "No se pudo completar la generación. Inténtalo de nuevo.", code: "AI_ERROR" },
    { status: 502 }
  );
}
