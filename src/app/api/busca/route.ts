import { NextResponse } from "next/server";
import { toCards } from "@/lib/photos/cards";
import { TenmlError, searchPerfumes } from "@/lib/tenml/client";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ error: "Informe q" }, { status: 400 });
  const cursor = params.get("cursor") ?? undefined;

  try {
    const page = await searchPerfumes({ q, limit: 20, cursor });
    const results = await toCards(page.results);
    return NextResponse.json({ results, nextCursor: page.nextCursor });
  } catch (error) {
    if (error instanceof TenmlError) {
      return NextResponse.json({ error: "Catálogo indisponível" }, { status: 502 });
    }
    throw error;
  }
}
