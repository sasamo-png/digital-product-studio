import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { serializeContent, contentPlatformSchema } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/content?platform=instagram — lista el contenido (filtro opcional).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platformParam = searchParams.get("platform");

  // Validar el filtro de plataforma si viene.
  let platform: string | undefined;
  if (platformParam) {
    const parsed = contentPlatformSchema.safeParse(platformParam);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Plataforma no válida." },
        { status: 400 }
      );
    }
    platform = parsed.data;
  }

  try {
    const items = await prisma.content.findMany({
      where: platform ? { platform } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items.map(serializeContent));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    console.error("[content] fallo al listar:", message);
    return NextResponse.json(
      { error: `No se pudo cargar el contenido: ${message}` },
      { status: 500 }
    );
  }
}
