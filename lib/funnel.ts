import type { Funnel, Product } from "@prisma/client";

import type {
  FunnelEmail,
  FunnelLandingPage,
  FunnelSalesSection,
  FunnelUpsell,
} from "@/lib/ai/funnel";

// DTO que viaja al cliente: campos complejos ya parseados desde JSON.
export type FunnelDTO = {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  productId: string;
  productTitle: string | null;
  landingPage: FunnelLandingPage | null;
  salesSections: FunnelSalesSection[];
  emailSequence: FunnelEmail[];
  upsells: FunnelUpsell[];
  createdAt: string;
};

// La parte "pages" del Funnel agrupa landing, sales y upsells en un solo JSON.
type FunnelPages = {
  landingPage: FunnelLandingPage;
  salesPage: { sections: FunnelSalesSection[] };
  upsells: FunnelUpsell[];
};

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function serializeFunnel(
  funnel: Funnel & { product: Product | null }
): FunnelDTO {
  const pages = safeParse<FunnelPages>(funnel.pages);
  const emails = safeParse<FunnelEmail[]>(funnel.emailSequence);

  return {
    id: funnel.id,
    name: funnel.name,
    goal: funnel.description,
    status: funnel.status,
    productId: funnel.productId,
    productTitle: funnel.product?.title ?? null,
    landingPage: pages?.landingPage ?? null,
    salesSections: pages?.salesPage?.sections ?? [],
    emailSequence: Array.isArray(emails) ? emails : [],
    upsells: pages?.upsells ?? [],
    createdAt: funnel.createdAt.toISOString(),
  };
}
