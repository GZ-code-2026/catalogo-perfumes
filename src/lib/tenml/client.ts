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

function toDetail(p: Cru, similar: Cru[]): PerfumeDetail {
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

// Sigla da concentração -> como ela aparece no nome do perfume.
const CONCENTRACOES: Record<string, string> = {
  edp: "eau de parfum",
  edt: "eau de toilette",
  edc: "eau de cologne",
};

// Monta as buscas para achar o perfume a partir do id, da mais específica
// para a mais solta. Ex.: "dior-sauvage-edt" ->
// "dior sauvage eau de toilette", "sauvage eau de toilette", "eau de toilette".
function buscasPorId(id: string): string[] {
  const palavras = id.split("-");
  const ultima = palavras[palavras.length - 1];
  if (CONCENTRACOES[ultima]) palavras[palavras.length - 1] = CONCENTRACOES[ultima];
  const frase = palavras.join(" ").split(" ");
  return [0, 1, 2]
    .map((cortar) => frase.slice(cortar).join(" "))
    .filter((q) => q !== "");
}

// Procura o id nos resultados das buscas e devolve o resumo (nome + casa).
async function acharResumoPorId(id: string): Promise<Cru | null> {
  for (const q of buscasPorId(id)) {
    const url = `${baseUrl()}/perfumes?q=${encodeURIComponent(q)}&limit=20`;
    const data = await chamar(url, 86400);
    const results: Cru[] = data?.results ?? [];
    const achado = results.find((r) => r.id === id);
    if (achado) return achado;
  }
  return null;
}

// Quirk da 10ML: buscar por id às vezes devolve OUTRO perfume (ex.: pedir
// "dior-sauvage-edt" volta o EDP) dizendo que é exato. Então, quando o id
// não confere, descobrimos o nome e a casa reais pela busca e consultamos
// por nome + casa, que funciona. Nunca devolvemos um id diferente do pedido.
async function resolverPorNome(id: string): Promise<PerfumeDetail | null> {
  const resumo = await acharResumoPorId(id);
  if (!resumo) return null;
  const url =
    `${baseUrl()}/perfumes/${encodeURIComponent(resumo.name)}` +
    `?house=${encodeURIComponent(resumo.house)}&format=detailed`;
  const data = await chamar(url, 86400);
  if (!data || data.found === false || data.exact === false) return null;
  if (data.perfume?.id !== id) return null;
  return toDetail(data.perfume, data.similar ?? []);
}

export async function getPerfume(id: string): Promise<PerfumeDetail | null> {
  const url = `${baseUrl()}/perfumes/${encodeURIComponent(id)}?format=detailed`;
  const data = await chamar(url, 86400);
  if (data?.found && data.exact !== false && data.perfume?.id === id) {
    return toDetail(data.perfume, data.similar ?? []);
  }
  return resolverPorNome(id);
}
