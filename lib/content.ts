import { z } from "zod";
import type { Content } from "@prisma/client";

// Plataformas soportadas. Vive aquí (módulo no server-only) para que tanto el
// cliente (UI) como el servidor (lib/ai) compartan la misma fuente de verdad.
export const CONTENT_PLATFORMS = [
  "instagram",
  "tiktok",
  "x",
  "facebook",
  "email",
] as const;

export const contentPlatformSchema = z.enum(CONTENT_PLATFORMS);
export type ContentPlatform = z.infer<typeof contentPlatformSchema>;

// DTO que viaja al cliente: hashtags ya parseados desde JSON.
export type ContentDTO = {
  id: string;
  title: string | null;
  platform: string;
  format: string;
  body: string;
  hashtags: string[];
  status: string;
  productId: string | null;
  createdAt: string;
};

function safeParseStringArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

export function serializeContent(content: Content): ContentDTO {
  return {
    id: content.id,
    title: content.title,
    platform: content.platform,
    format: content.format,
    body: content.text,
    hashtags: safeParseStringArray(content.hashtags),
    status: content.status,
    productId: content.productId,
    createdAt: content.createdAt.toISOString(),
  };
}
