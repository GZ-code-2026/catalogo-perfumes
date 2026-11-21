// Lógica pura do renormalize:seen, separada para poder ser testada.
import { fragellaKey } from "../src/lib/photos/match";

export interface LinhaSeen {
  id: number;
  raw_brand: string;
  raw_name: string;
  concentration: string | null;
  image_url: string;
  brand_norm: string;
  name_norm: string;
}

export interface ChaveSeen {
  brand_norm: string;
  name_norm: string;
  concentration: string | null;
}

// Recalcula marca, nome e concentração com as regras atuais.
// O público ("for men"/"for women") não é gravado: as lojas o leem de raw_name na hora.
// A concentração vem do nome, se ele tiver; senão fica a que já estava gravada (veio do OilType).
export function recalcularLinha(linha: LinhaSeen): ChaveSeen {
  const key = fragellaKey({ brand: linha.raw_brand, name: linha.raw_name });
  return {
    brand_norm: key.brand,
    name_norm: key.name,
    concentration: key.concentration ?? linha.concentration,
  };
}

// Mesma regra do índice único do banco: (marca, nome, concentração ou '', imagem).
function chaveUnica(chave: ChaveSeen, imageUrl: string): string {
  return `${chave.brand_norm}|${chave.name_norm}|${chave.concentration ?? ""}|${imageUrl}`;
}

// Decide o que atualizar e o que apagar. Linhas que não mudam guardam o lugar primeiro;
// uma linha que viraria cópia de outra já existente é apagada.
export function planejarRenormalizacao(linhas: LinhaSeen[]): {
  atualizar: (ChaveSeen & { id: number })[];
  apagar: number[];
} {
  const atualizar: (ChaveSeen & { id: number })[] = [];
  const apagar: number[] = [];
  const ocupadas = new Set<string>();

  const recalculadas = linhas.map((linha) => {
    const nova = recalcularLinha(linha);
    const mudou =
      nova.brand_norm !== linha.brand_norm ||
      nova.name_norm !== linha.name_norm ||
      nova.concentration !== linha.concentration;
    return { linha, nova, mudou };
  });

  // 1ª volta: linhas que não mudam.
  for (const { linha, nova, mudou } of recalculadas) {
    if (mudou) continue;
    const chave = chaveUnica(nova, linha.image_url);
    if (ocupadas.has(chave)) apagar.push(linha.id);
    else ocupadas.add(chave);
  }

  // 2ª volta: linhas que mudam.
  for (const { linha, nova, mudou } of recalculadas) {
    if (!mudou) continue;
    const chave = chaveUnica(nova, linha.image_url);
    if (ocupadas.has(chave)) {
      apagar.push(linha.id);
    } else {
      ocupadas.add(chave);
      atualizar.push({ id: linha.id, ...nova });
    }
  }

  return { atualizar, apagar };
}
