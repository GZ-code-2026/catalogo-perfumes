import { describe, it, expect } from 'vitest';
import { createMemoryStore } from './memory-store';

describe('memory store', () => {
  it('getCached de id desconhecido devolve null', async () => {
    const store = createMemoryStore();
    expect(await store.getCached('x')).toBeNull();
  });

  it('saveCached seguido de getCached devolve status e URL', async () => {
    const store = createMemoryStore();
    await store.saveCached('1', { status: 'found', imageUrl: 'http://a/1.jpg', matchedName: 'A' });
    expect(await store.getCached('1')).toEqual({ status: 'found', imageUrl: 'http://a/1.jpg' });
  });

  it('getCachedMany devolve só os existentes', async () => {
    const store = createMemoryStore();
    await store.saveCached('1', { status: 'none', imageUrl: null, matchedName: null });
    const result = await store.getCachedMany(['1', '2']);
    expect([...result.keys()]).toEqual(['1']);
  });

  it('addSeen duplicado não duplica findSeenByBrand', async () => {
    const store = createMemoryStore();
    const item = {
      brand: 'dior', name: 'sauvage', concentration: 'edt' as const,
      audience: null, audienceExplicit: false,
      imageUrl: 'http://a/s.jpg', rawName: 'Sauvage EDT', rawBrand: 'Dior',
    };
    await store.addSeen([item]);
    await store.addSeen([item]);
    const seen = await store.findSeenByBrand('dior');
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({
      brand: 'dior', name: 'sauvage', concentration: 'edt',
      audience: null, audienceExplicit: false,
      imageUrl: 'http://a/s.jpg', rawName: 'Sauvage EDT',
    });
    expect(await store.findSeenByBrand('chanel')).toEqual([]);
  });

  it('público é lido do nome original, como no Supabase (sem coluna própria)', async () => {
    const store = createMemoryStore();
    await store.addSeen([{
      brand: 'dolce gabbana', name: 'the one', concentration: 'edp',
      audience: null, audienceExplicit: false,
      imageUrl: 'http://a/one.jpg', rawName: 'The One for Men', rawBrand: 'Dolce & Gabbana',
    }]);
    const [seen] = await store.findSeenByBrand('dolce gabbana');
    expect(seen.audience).toBe('men');
    expect(seen.audienceExplicit).toBe(true);
  });

  it('incrementUsage soma e getUsage de outro mês é 0', async () => {
    const store = createMemoryStore();
    expect(await store.incrementUsage('2026-11')).toBe(1);
    expect(await store.incrementUsage('2026-11')).toBe(2);
    expect(await store.getUsage('2026-11')).toBe(2);
    expect(await store.getUsage('2026-12')).toBe(0);
  });
});
