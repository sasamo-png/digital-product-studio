import type { Ebook, Product } from "@prisma/client";

import type { EbookChapter, EbookOutlineItem } from "@/lib/ai/ebook";

// DTO que viaja al cliente: chapters/outline ya parseados desde JSON.
export type EbookDTO = {
  id: string;
  productId: string;
  title: string;
  subtitle: string | null;
  niche: string | null;
  status: string;
  coverBrief: string | null;
  salesCopy: string | null;
  outline: EbookOutlineItem[];
  chapters: EbookChapter[];
  createdAt: string;
};

function safeParseArray<T>(value: string | null): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

// Convierte una entidad Ebook (con su Product) en el DTO para el cliente.
export function serializeEbook(
  ebook: Ebook & { product: Product | null }
): EbookDTO {
  return {
    id: ebook.id,
    productId: ebook.productId,
    title: ebook.title,
    subtitle: ebook.subtitle,
    niche: ebook.product?.niche ?? null,
    status: ebook.status,
    coverBrief: ebook.coverPrompt,
    salesCopy: ebook.salesCopy,
    outline: safeParseArray<EbookOutlineItem>(ebook.outline ?? null),
    chapters: safeParseArray<EbookChapter>(ebook.chapters),
    createdAt: ebook.createdAt.toISOString(),
  };
}
