import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  analyzeNiche,
  analyzeNicheInputSchema,
} from "@/lib/ai/market-research";
import { scoreLabel, serializeMarketResearch } from "@/lib/market-research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Parsear el cuerpo.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición no es JSON válido." },
      { status: 400 }
    );
  }

  // 2. Validar la entrada con zod.
  const parsed = analyzeNicheInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos de entrada inválidos.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // 3. Analizar el nicho con IA (lado servidor).
  let result;
  try {
    result = await analyzeNiche(input);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error desconocido en el análisis.";
    console.error("[market-research/analyze] fallo en analyzeNiche:", message);
    return NextResponse.json(
      { error: `No se pudo analizar el nicho: ${message}` },
      { status: 502 }
    );
  }

  // 4. Persistir: MarketResearch + Competitor asociados.
  try {
    const research = await prisma.marketResearch.create({
      data: {
        niche: input.niche,
        summary: result.summary,
        demand: scoreLabel(result.demandScore),
        demandScore: result.demandScore,
        competition: scoreLabel(result.competitionScore),
        competitionScore: result.competitionScore,
        profitabilityScore: result.profitScore,
        status: "completed",
        competitors: {
          create: result.competitors.map((c) => ({
            name: c.name,
            strengths: c.strength,
            weaknesses: c.weakness,
          })),
        },
      },
      include: { competitors: true },
    });

    return NextResponse.json(serializeMarketResearch(research), {
      status: 201,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error desconocido al guardar.";
    console.error("[market-research/analyze] fallo al persistir:", message);
    return NextResponse.json(
      { error: `El análisis se generó pero no se pudo guardar: ${message}` },
      { status: 500 }
    );
  }
}
