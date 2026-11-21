import type {
  PerfumeDetail,
  PerfumeSummary,
  SearchPage,
  SimilarItem,
} from "./types";

// Formato cru da API (campos em snake_case, quase tudo opcional).
type Cru = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export class TenmlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenmlError";
  }
}

// Lido dentro das funções para os testes poderem mudar a variável.
function baseUrl(): string {
  return process.env.TENML_BASE_URL || "https://mcp.10ml.com/api/v1";
}

// Faz a chamada e devolve o JSON; o status 404 vira `null`.
async function chamar(url: string, revalidate: number): Promise<Cru | null> {
  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate },
    } as RequestInit);
  } catch {
    throw new TenmlError("Não foi possível falar com a 10ML");
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new TenmlError(`A 10ML respondeu com status ${res.status}`);
  try {
    return await res.json();
  } catch {
    throw new TenmlError("Resposta inválida da 10ML");
  }
}

function toSummary(p: Cru): PerfumeSummary {
  return {
    id: p.id,
    name: p.name,
    house: p.house,
    year: p.year ?? undefined,
    gender: p.gender ?? undefined,
    family: p.family ?? undefined,
    accords: p.accords ?? [],
    keyNotes: p.key_notes ?? [],
    character: p.character ?? undefined,
  };
}

// Pirâmide sem nenhuma nota nos três níveis não é mostrada.
function toPyramid(raw: Cru | null | undefined): PerfumeDetail["pyramid"] {
  if (!raw) return undefined;
  const pyramid = { top: raw.top ?? [], heart: raw.heart ?? [], base: raw.base ?? [] };
  const vazia = pyramid.top.length === 0 && pyramid.heart.length === 0 && pyramid.base.length === 0;
  return vazia ? undefined : pyramid;
}

function toSimilar(s: Cru): SimilarItem {
  return {
    id: s.id,
    name: s.name,
    house: s.house,
    closeness: s.closeness ?? undefined,
    sharedNotes: s.shared_notes ?? [],
  };
}

export async function searchPerfumes(p: {
  q?: string;
  iconic?: boolean;
  limit?: number;
  cursor?: string;
}): Promise<SearchPage> {
  const params = new URLSearchParams();
  if (p.q) params.set("q", p.q);
  if (p.iconic) params.set("iconic", "true");
  if (p.cursor) params.set("cursor", p.cursor);
  params.set("limit", String(p.limit ?? 20));

  const data = await chamar(`${baseUrl()}/perfumes?${params}`, 300);
  if (!data) throw new TenmlError("Busca não encontrada na 10ML");
  const results: Cru[] = data.results ?? [];
  return {
    results: results.map(toSummary),
    nextCursor: data.next_cursor ?? null,
    total: data.total ?? results.length,
  };
}

export async function getPerfume(id: string): Promise<PerfumeDetail | null> {
  const url = `${baseUrl()}/perfumes/${encodeURIComponent(id)}?format=detailed`;
  const data = await chamar(url, 86400);
  if (!data || data.found === false || data.exact === false || !data.perfume) {
    return null;
  }
  const p = data.perfume;
  const similar: Cru[] = data.similar ?? [];
  return {
    ...toSummary(p),
    concentration: p.concentration ?? undefined,
    pyramid: toPyramid(p.pyramid),
    seasons: p.seasons ?? [],
    occasions: p.occasions ?? [],
    styles: p.styles ?? [],
    longevity: p.longevity ?? undefined,
    projection: p.projection ?? undefined,
    perfumers: p.perfumers ?? [],
    similar: similar.map(toSimilar),
  };
}
