// Cliente da Fragella, usado SÓ para achar fotos de frascos.
// O plano grátis tem poucas chamadas por mês: aqui nada lança erro,
// qualquer falha devolve `null`.

export interface FragellaItem {
  name: string;
  brand: string;
  oilType?: string;
  imageUrl?: string;
  imageUrlTransparent?: string;
}

// Lido dentro das funções para os testes poderem mudar as variáveis.
export function isFragellaConfigured(): boolean {
  return Boolean(process.env.FRAGELLA_API_KEY);
}

function baseUrl(): string {
  return process.env.FRAGELLA_BASE_URL || "https://api.fragella.com/api/v1";
}

function texto(v: unknown): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

export async function searchFragrances(
  query: string,
): Promise<FragellaItem[] | null> {
  const chave = process.env.FRAGELLA_API_KEY;
  if (!chave) return null;

  const params = new URLSearchParams({ search: query, limit: "10" });
  try {
    const res = await fetch(`${baseUrl()}/fragrances?${params}`, {
      headers: { "x-api-key": chave },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return null;

    const corpo = await res.json();
    // Sem `page` vem um array; com `page` vem { data: [...] }.
    const lista = Array.isArray(corpo) ? corpo : corpo?.data;
    if (!Array.isArray(lista)) return null;

    const itens: FragellaItem[] = [];
    for (const o of lista) {
      const name = texto(o?.Name);
      const brand = texto(o?.Brand);
      if (!name || !brand) continue;
      itens.push({
        name,
        brand,
        oilType: texto(o.OilType),
        imageUrl: texto(o["Image URL"]),
        imageUrlTransparent: texto(o["Image URL Transparent"]),
      });
    }
    return itens;
  } catch {
    return null;
  }
}

// Prefere a imagem transparente; só aceita https.
export function pickImage(item: FragellaItem): string | null {
  for (const url of [item.imageUrlTransparent, item.imageUrl]) {
    if (url && url.startsWith("https://")) return url;
  }
  return null;
}
