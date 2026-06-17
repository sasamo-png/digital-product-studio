import { NextResponse } from "next/server";

import { getOpenAIClient } from "@/lib/ai/openai";
import { getUserApiKey, aiErrorResponse } from "@/lib/ai/request-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/ai/validate — comprueba que la API key del usuario (cabecera
// x-openai-key) es válida con una llamada mínima. No genera contenido ni guarda nada.
export async function POST(request: Request) {
  let apiKey: string;
  try {
    apiKey = getUserApiKey(request);
  } catch (err) {
    return aiErrorResponse(err);
  }

  try {
    const client = getOpenAIClient(apiKey);
    // Llamada ligera: listar modelos valida la credencial sin coste de generación.
    await client.models.list();
    return NextResponse.json({ valid: true });
  } catch (err) {
    console.error(
      "[ai/validate] key inválida o error:",
      err instanceof Error ? err.message : err
    );
    return aiErrorResponse(err);
  }
}
