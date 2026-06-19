-- Añade las justificaciones de cada nota de la investigación de mercado.
-- Fuerzan que la IA razone antes de puntuar (mejor diferenciación entre nichos)
-- y se muestran en la UI junto a cada score.
ALTER TABLE "MarketResearch" ADD COLUMN "demandRationale" TEXT;
ALTER TABLE "MarketResearch" ADD COLUMN "competitionRationale" TEXT;
ALTER TABLE "MarketResearch" ADD COLUMN "profitabilityRationale" TEXT;
