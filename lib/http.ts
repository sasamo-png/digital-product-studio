import "server-only";

import { NextResponse } from "next/server";

// Tope de tamaño del cuerpo de las peticiones JSON. Los formularios de la app
// son pequeños (texto plano), así que 64 KB es holgado y evita materializar en
// memoria payloads enormes antes de validar con zod.
const DEFAULT_MAX_BYTES = 64 * 1024;

export class BodyTooLargeError extends Error {
  constructor() {
    super("El cuerpo de la petición es demasiado grande.");
    this.name = "BodyTooLargeError";
  }
}

export class InvalidJsonError extends Error {
  constructor() {
    super("El cuerpo de la petición no es JSON válido.");
    this.name = "InvalidJsonError";
  }
}

// Lee y parsea el cuerpo JSON con un tope de tamaño. Lanza BodyTooLargeError o
// InvalidJsonError; usa `jsonBodyErrorResponse` para convertirlos en respuesta.
export async function readJsonBody(
  request: Request,
  maxBytes = DEFAULT_MAX_BYTES
): Promise<unknown> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    throw new BodyTooLargeError();
  }

  // Un fallo al leer el cuerpo (cliente aborta el stream, transfer-encoding
  // corrupto, …) se loguea y se trata como cuerpo inválido (400), en vez de
  // propagar un error inesperado que la route enmascararía sin traza.
  let text: string;
  try {
    text = await request.text();
  } catch (err) {
    console.error("[http] no se pudo leer el cuerpo de la petición:", err);
    throw new InvalidJsonError();
  }

  // `text.length` cuenta unidades UTF-16; como cota superior basta para frenar
  // abusos sin necesidad de codificar a bytes.
  if (text.length > maxBytes) {
    throw new BodyTooLargeError();
  }
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    throw new InvalidJsonError();
  }
}

// Convierte los errores de readJsonBody en una respuesta HTTP. Devuelve null si
// el error no es uno de los esperados (para que la route lo re-lance/maneje).
export function jsonBodyErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof BodyTooLargeError) {
    return NextResponse.json({ error: err.message }, { status: 413 });
  }
  if (err instanceof InvalidJsonError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  return null;
}
