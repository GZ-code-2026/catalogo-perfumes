import { NextResponse } from "next/server";
import { TenmlError, searchPerfumes } from "@/lib/tenml/client";

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ items: [] });

  try {
    const page = await searchPerfumes({ q, limit: 8 });
    const items = page.results.slice(0, 8).map((p) => ({ id: p.id, name: p.name, house: p.house }));
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof TenmlError) return NextResponse.json({ items: [] }, { status: 502 });
    throw error;
  }
}
