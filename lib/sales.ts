import { z } from "zod";

// Canales de venta soportados. Vive en un módulo no server-only para que el
// cliente (UI) y el servidor (lib/ai) compartan la misma fuente de verdad.
export const SALES_CHANNELS = [
  "instagram_dm",
  "whatsapp",
  "email",
  "llamada",
] as const;

export const salesChannelSchema = z.enum(SALES_CHANNELS);
export type SalesChannel = z.infer<typeof salesChannelSchema>;

// Etiquetas legibles para la UI.
export const SALES_CHANNEL_LABELS: Record<SalesChannel, string> = {
  instagram_dm: "Instagram DM",
  whatsapp: "WhatsApp",
  email: "Email",
  llamada: "Llamada",
};
