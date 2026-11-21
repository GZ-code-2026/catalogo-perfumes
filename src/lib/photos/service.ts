import { pickImage, type FragellaItem } from '../fragella/client';
import { findMatch, toKey, type MatchCandidate } from './match';
import type { PhotoStore } from './store';

export interface PhotoSubject {
  id: string;
  name: string;
  house: string;
  concentration?: string;
}

export interface PhotoService {
  getPhoto(p: PhotoSubject, opts: { allowFetch: boolean }): Promise<string | null>;
  getPhotosCacheOnly(ps: PhotoSubject[]): Promise<Map<string, string | null>>;
}

export function createPhotoService(deps: {
  store: PhotoStore | null;
  search: ((query: string) => Promise<FragellaItem[] | null>) | null;
  budget: number;
  now?: () => Date;
}): PhotoService {
  const { store, search, budget } = deps;
  const now = deps.now ?? (() => new Date());

  // Passo 3: procura nos resultados da Fragella já vistos; se casar, grava no cache.
  // Só o getPhoto usa esta função, porque ele recebe os dados completos (com concentração).
  async function fromSeen(store: PhotoStore, p: PhotoSubject): Promise<string | null> {
    const key = toKey(p.house, p.name, p.concentration);
    const match = findMatch(key, await store.findSeenByBrand(key.brand));
    if (!match) return null;
    await store.saveCached(p.id, {
      status: 'found',
      imageUrl: match.imageUrl,
      matchedName: match.rawName,
    });
    return match.imageUrl;
  }

  // Passos 5 a 8: gasta uma chamada da Fragella (se houver orçamento).
  async function fromFragella(store: PhotoStore, searchFn: NonNullable<typeof search>, p: PhotoSubject) {
    const month = now().toISOString().slice(0, 7);
    if ((await store.getUsage(month)) >= budget) return null;

    // Reserva a chamada ANTES de buscar: assim nenhuma chamada cobrada fica sem contar,
    // e duas requisições ao mesmo tempo não passam juntas do orçamento.
    // Se a busca falhar, contamos uma a mais (é o lado seguro).
    const reserved = await store.incrementUsage(month);
    if (reserved > budget) return null;

    const items = await searchFn(`${p.house} ${p.name}`);
    if (items === null) return null;

    const candidates: (MatchCandidate & { rawBrand: string })[] = [];
    for (const item of items) {
      const imageUrl = pickImage(item);
      if (!imageUrl) continue;
      candidates.push({
        ...toKey(item.brand, item.name, item.oilType),
        imageUrl,
        rawName: item.name,
        rawBrand: item.brand,
      });
    }
    await store.addSeen(candidates);

    const match = findMatch(toKey(p.house, p.name, p.concentration), candidates);
    if (match) {
      await store.saveCached(p.id, {
        status: 'found',
        imageUrl: match.imageUrl,
        matchedName: match.rawName,
      });
      return match.imageUrl;
    }
    await store.saveCached(p.id, { status: 'none', imageUrl: null, matchedName: null });
    return null;
  }

  return {
    async getPhoto(p, opts) {
      if (!store) return null;
      if (`${p.house} ${p.name}`.trim() === '') return null;
      try {
        const cached = await store.getCached(p.id);
        if (cached) return cached.imageUrl;

        const seen = await fromSeen(store, p);
        if (seen) return seen;

        if (!opts.allowFetch || !search) return null;
        return await fromFragella(store, search, p);
      } catch (error) {
        console.error('Erro no serviço de fotos:', error);
        return null;
      }
    },

    async getPhotosCacheOnly(ps) {
      const result = new Map<string, string | null>();
      for (const p of ps) result.set(p.id, null);
      if (!store) return result;
      try {
        const cached = await store.getCachedMany(ps.map((p) => p.id));
        for (const p of ps) {
          const entry = cached.get(p.id);
          if (entry) {
            result.set(p.id, entry.imageUrl);
          } else if (`${p.house} ${p.name}`.trim() !== '') {
            // Só para mostrar: os resumos da busca não trazem a concentração,
            // então aqui nunca gravamos nada no cache.
            const key = toKey(p.house, p.name, p.concentration);
            const match = findMatch(key, await store.findSeenByBrand(key.brand));
            result.set(p.id, match ? match.imageUrl : null);
          }
        }
      } catch (error) {
        console.error('Erro no serviço de fotos:', error);
      }
      return result;
    },
  };
}
