import { audienceFromName, type MatchCandidate } from './match';
import type { CachedPhoto, PhotoStore } from './store';

// Armazenamento em memória, usado nos testes.
export function createMemoryStore(): PhotoStore {
  const cache = new Map<string, CachedPhoto>();
  // Como no Supabase, o público não é guardado: é lido do nome original na hora.
  const seen: Omit<MatchCandidate, 'audience' | 'audienceExplicit'>[] = [];
  const usage = new Map<string, number>();

  return {
    async getCached(tenmlId) {
      return cache.get(tenmlId) ?? null;
    },
    async getCachedMany(tenmlIds) {
      const result = new Map<string, CachedPhoto>();
      for (const id of tenmlIds) {
        const entry = cache.get(id);
        if (entry) result.set(id, entry);
      }
      return result;
    },
    async saveCached(tenmlId, entry) {
      cache.set(tenmlId, { status: entry.status, imageUrl: entry.imageUrl });
    },
    async findSeenByBrand(brand) {
      return seen
        .filter((s) => s.brand === brand)
        .map((s) => {
          const audience = audienceFromName(s.rawName);
          return { ...s, audience, audienceExplicit: audience !== null };
        });
    },
    async addSeen(items) {
      for (const item of items) {
        const duplicate = seen.some(
          (s) =>
            s.brand === item.brand &&
            s.name === item.name &&
            s.concentration === item.concentration &&
            s.imageUrl === item.imageUrl,
        );
        if (duplicate) continue;
        seen.push({
          brand: item.brand,
          name: item.name,
          concentration: item.concentration,
          imageUrl: item.imageUrl,
          rawName: item.rawName,
        });
      }
    },
    async getUsage(month) {
      return usage.get(month) ?? 0;
    },
    async incrementUsage(month) {
      const total = (usage.get(month) ?? 0) + 1;
      usage.set(month, total);
      return total;
    },
  };
}
