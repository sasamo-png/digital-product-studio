import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { generateEbook, generateEbookInputSchema } from "@/lib/ai/ebook";
import { getUserApiKey, aiErrorResponse } from "@/lib/ai/request-key";
import { serializeEbook } from "@/lib/ebooks";

// Prisma y OpenAI requieren el runtime de Node (no edge).
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
  const parsed = generateEbookInputSchema.safeParse(body);
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

  // 3. API key del usuario (BYOK) y generación con IA (lado servidor).
  let apiKey: string;
  try {
    apiKey = getUserApiKey(request);
  } catch (err) {
    return aiErrorResponse(err);
  }

  let result;
  try {
    result = await generateEbook(input, apiKey);
  } catch (err) {
    console.error(
      "[ebooks/generate] fallo en generateEbook:",
      err instanceof Error ? err.message : err
    );
    return aiErrorResponse(err);
  }

  // 4. Persistir: Product + Ebook asociado.
  try {
    const product = await prisma.product.create({
      data: {
        title: input.title,
        type: "ebook",
        niche: input.niche,
        status: "draft",
        ebook: {
          create: {
            title: input.title,
            outline: JSON.stringify(result.outline),
            chapters: JSON.stringify(result.chapters),
            coverPrompt: result.coverBrief,
            salesCopy: result.salesCopy,
            status: "ready",
          },
        },
      },
      include: { ebook: true },
    });

    if (!product.ebook) {
      throw new Error("El ebook no se creó correctamente.");
    }

    const dto = serializeEbook({ ...product.ebook, product });
    return NextResponse.json(dto, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error desconocido al guardar.";
    console.error("[ebooks/generate] fallo al persistir:", message);
    return NextResponse.json(
      { error: `El ebook se generó pero no se pudo guardar: ${message}` },
      { status: 500 }
    );
  }
}
