import { NextResponse } from "next/server";
import { z } from "zod";

import { getSettings, updateSettings } from "@/lib/settings";
import { isSupportedModel } from "@/lib/models";
import { readJsonBody, jsonBodyErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const settingsInputSchema = z
  .object({
    // Vacío/null = "usar el modelo por defecto". Si se indica uno, debe ser un
    // modelo soportado: así evitamos guardar un modelo que rompería TODAS las
    // generaciones (json_schema strict no soportado, modelo inexistente, …).
    defaultModel: z
      .string()
      .trim()
      .max(80)
      .refine((m) => m === "" || isSupportedModel(m), {
        message: "Modelo no soportado.",
      })
      .nullable()
      .optional(),
    defaultTone: z.string().trim().max(120).nullable().optional(),
    brandName: z.string().trim().max(120).nullable().optional(),
  })
  .strict();

// GET /api/settings — preferencias (sin secretos).
export async function GET() {
  try {
    return NextResponse.json(await getSettings());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    console.error("[settings] GET fallo:", message);
    return NextResponse.json(
      { error: "No se pudieron cargar las preferencias." },
      { status: 500 }
    );
  }
}

// PUT /api/settings — actualiza preferencias.
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    return (
      jsonBodyErrorResponse(err) ??
      NextResponse.json(
        { error: "El cuerpo de la petición no es JSON válido." },
        { status: 400 }
      )
    );
  }

  const parsed = settingsInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos inválidos.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(await updateSettings(parsed.data));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    console.error("[settings] PUT fallo:", message);
    return NextResponse.json(
      { error: "No se pudieron guardar las preferencias." },
      { status: 500 }
    );
  }
}
