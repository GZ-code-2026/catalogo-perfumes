import type { MatchCandidate } from './match';

export interface CachedPhoto {
  status: 'found' | 'none';
  imageUrl: string | null;
}

export interface PhotoStore {
  getCached(tenmlId: string): Promise<CachedPhoto | null>;
  getCachedMany(tenmlIds: string[]): Promise<Map<string, CachedPhoto>>;
  saveCached(tenmlId: string, entry: CachedPhoto & { matchedName: string | null }): Promise<void>;
  findSeenByBrand(brand: string): Promise<MatchCandidate[]>; // brand já normalizada
  addSeen(items: (MatchCandidate & { rawBrand: string })[]): Promise<void>; // ignora duplicados
  getUsage(month: string): Promise<number>; // 'YYYY-MM'
  incrementUsage(month: string): Promise<number>; // atômico, retorna novo total
}
