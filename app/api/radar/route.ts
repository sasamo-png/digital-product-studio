import { NextResponse } from "next/server";
import { z } from "zod";

import { readJsonBody, jsonBodyErrorResponse } from "@/lib/http";
import { buildAdsLibraryUrl, serializeRadar, type RawRadar } from "@/lib/radar";
import { classifyRadarNiche } from "@/lib/ai/radar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // el scrapeo tarda ~60s

// Microservicio del robot (contenedor Docker aislado). Configurable por entorno.
const RADAR_URL = process.env.RADAR_URL ?? "http://localhost:3010";
const RADAR_SECRET = process.env.RADAR_SECRET; // opcional, si el robot añade auth

const inputSchema = z.object({
  keyword: z.string().trim().min(1, "Escribe una palabra clave o anunciante.").max(120),
  country: z.string().trim().min(2).max(3).default("AR"),
  enrich: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  // 1. Parsear el cuerpo.
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

  // 2. Validar la entrada.
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos de entrada inválidos.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { keyword, country, enrich } = parsed.data;

  // 3. Llamar al microservicio del robot.
  const url = buildAdsLibraryUrl(keyword, country);
  let raw: RawRadar;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    const res = await fetch(`${RADAR_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(RADAR_SECRET ? { "x-radar-key": RADAR_SECRET } : {}),
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    raw = (await res.json()) as RawRadar;
    if (!res.ok || !raw?.ok) {
      return NextResponse.json(
        {
          error:
            (raw as { error?: string })?.error ??
            "El radar no pudo analizar la búsqueda.",
        },
        { status: 502 }
      );
    }
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    console.error(
      "[radar] fallo al contactar con el microservicio:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      {
        error: aborted
          ? "El radar tardó demasiado (>2 min). Prueba otra búsqueda."
          : "No se pudo conectar con el radar. ¿Está arrancado el servicio?",
        code: "RADAR_UNAVAILABLE",
      },
      { status: 503 }
    );
  }

  const result = serializeRadar(raw);

  // 4. Enriquecer el nicho con IA (BYOK) si hay key. Con fallback al nicho del robot.
  const apiKey = request.headers.get("x-openai-key")?.trim();
  if (enrich && apiKey && result.ads.length) {
    try {
      const samples = result.ads
        .map((a) => a.copy)
        .filter((c) => c && c.length > 20)
        .slice(0, 8);
      if (samples.length) {
        const ai = await classifyRadarNiche(
          { country, pageName: result.pageName, samples },
          apiKey
        );
        result.niche = ai.niche;
        result.angle = ai.angle;
        result.nicheSource = "ia";
      }
    } catch (err) {
      console.warn(
        "[radar] enriquecimiento IA falló, se usa el nicho del robot:",
        err instanceof Error ? err.message : err
      );
    }
  }

  return NextResponse.json(result, { status: 200 });
}
