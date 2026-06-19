import type { Competitor, MarketResearch } from "@prisma/client";

import type { NicheCompetitor } from "@/lib/ai/market-research";

// DTO que viaja al cliente.
export type MarketResearchDTO = {
  id: string;
  niche: string;
  summary: string | null;
  demandScore: number;
  demandRationale: string | null;
  competitionScore: number;
  competitionRationale: string | null;
  profitScore: number;
  profitRationale: string | null;
  status: string;
  competitors: NicheCompetitor[];
  createdAt: string;
};

// Etiqueta cualitativa para un score 0-100 (usada en demand/competition String).
export function scoreLabel(value: number): "low" | "medium" | "high" {
  if (value < 34) return "low";
  if (value < 67) return "medium";
  return "high";
}

export function serializeMarketResearch(
  research: MarketResearch & { competitors: Competitor[] }
): MarketResearchDTO {
  return {
    id: research.id,
    niche: research.niche,
    summary: research.summary,
    demandScore: research.demandScore,
    demandRationale: research.demandRationale,
    competitionScore: research.competitionScore,
    competitionRationale: research.competitionRationale,
    profitScore: research.profitabilityScore,
    profitRationale: research.profitabilityRationale,
    status: research.status,
    competitors: research.competitors.map((c) => ({
      name: c.name,
      strength: c.strengths ?? "",
      weakness: c.weaknesses ?? "",
    })),
    createdAt: research.createdAt.toISOString(),
  };
}
