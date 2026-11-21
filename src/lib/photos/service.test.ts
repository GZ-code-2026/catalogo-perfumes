import { describe, expect, it, vi } from 'vitest';
import type { FragellaItem } from '../fragella/client';
import { toKey } from './match';
import { createMemoryStore } from './memory-store';
import type { PhotoStore } from './store';
import { createPhotoService } from './service';

const now = () => new Date('2026-11-21T12:00:00Z');
const MONTH = '2026-11';

const subject = { id: 'p1', name: 'Sauvage', house: 'Dior', concentration: 'EDT' };

function item(name: string, brand: string, imageUrl: string | null, oilType?: string): FragellaItem {
  return { name, brand, oilType, imageUrl: imageUrl ?? undefined };
}

function seenEntry(house: string, name: string, imageUrl: string, hint?: string) {
  return { ...toKey(house, name, hint), imageUrl, rawName: name, rawBrand: house };
}

function setup(items: FragellaItem[] | null = [], budget = 18) {
  const store = createMemoryStore();
  const search = vi.fn(async (_q: string) => items);
  const service = createPhotoService({ store, search, budget, now });
  return { store, search, service };
}

describe('createPhotoService', () => {
  it('cache found devolve a URL sem buscar', async () => {
    const { store, search, service } = setup();
    await store.saveCached('p1', { status: 'found', imageUrl: 'https://x/a.png', matchedName: 'Sauvage' });
    expect(await service.getPhoto(subject, { allowFetch: true })).toBe('https://x/a.png');
    expect(search).not.toHaveBeenCalled();
  });

  it('cache none devolve null sem buscar', async () => {
    const { store, search, service } = setup();
    await store.saveCached('p1', { status: 'none', imageUrl: null, matchedName: null });
    expect(await service.getPhoto(subject, { allowFetch: true })).toBeNull();
    expect(search).not.toHaveBeenCalled();
  });

  it('casamento em fragella_seen grava found e não busca', async () => {
    const { store, search, service } = setup();
    await store.addSeen([seenEntry('Dior', 'Sauvage', 'https://x/seen.png', 'edt')]);
    expect(await service.getPhoto(subject, { allowFetch: true })).toBe('https://x/seen.png');
    expect((await store.getCached('p1'))?.status).toBe('found');
    expect(search).not.toHaveBeenCalled();
  });

  it('allowFetch false sem cache devolve null e não grava', async () => {
    const { store, search, service } = setup();
    expect(await service.getPhoto(subject, { allowFetch: false })).toBeNull();
    expect(search).not.toHaveBeenCalled();
    expect(await store.getCached('p1')).toBeNull();
    expect(await store.getUsage(MONTH)).toBe(0);
  });

  it('orçamento esgotado devolve null sem buscar nem gravar none', async () => {
    const { store, search, service } = setup([], 18);
    for (let i = 0; i < 18; i++) await store.incrementUsage(MONTH);
    expect(await service.getPhoto(subject, { allowFetch: true })).toBeNull();
    expect(search).not.toHaveBeenCalled();
    expect(await store.getCached('p1')).toBeNull();
  });

  it('busca com um item que casa devolve a URL e atualiza uso, seen e cache', async () => {
    const { store, search, service } = setup([
      item('Sauvage Eau de Toilette', 'Dior', 'https://x/right.png', 'Eau de Toilette'),
      item('Fahrenheit', 'Dior', 'https://x/fahr.png', 'Eau de Toilette'),
      item('Homme', 'Dior', 'https://x/homme.png', 'Eau de Toilette'),
    ]);
    expect(await service.getPhoto(subject, { allowFetch: true })).toBe('https://x/right.png');
    expect(search).toHaveBeenCalledWith('Dior Sauvage');
    expect(await store.getUsage(MONTH)).toBe(1);
    expect((await store.findSeenByBrand(toKey('Dior', 'x').brand)).length).toBe(3);
    expect(await store.getCached('p1')).toEqual({ status: 'found', imageUrl: 'https://x/right.png' });
  });

  it('busca sem casamento grava none e conta uso', async () => {
    const { store, service } = setup([item('Fahrenheit', 'Dior', 'https://x/fahr.png', 'Eau de Toilette')]);
    expect(await service.getPhoto(subject, { allowFetch: true })).toBeNull();
    expect(await store.getCached('p1')).toEqual({ status: 'none', imageUrl: null });
    expect(await store.getUsage(MONTH)).toBe(1);
  });

  it('falha da Fragella (429/5xx = null) não grava, mas a reserva conta 1 de uso', async () => {
    const { store, service } = setup(null);
    expect(await service.getPhoto(subject, { allowFetch: true })).toBeNull();
    expect(await store.getUsage(MONTH)).toBe(1);
    expect(await store.getCached('p1')).toBeNull();
  });

  it('reserva antes de buscar: se o total reservado passa do orçamento, não busca', async () => {
    const { store, search, service } = setup([], 18);
    for (let i = 0; i < 18; i++) await store.incrementUsage(MONTH);
    // Simula outra requisição que reservou entre a leitura e a reserva.
    store.getUsage = async () => 17;
    expect(await service.getPhoto(subject, { allowFetch: true })).toBeNull();
    expect(search).not.toHaveBeenCalled();
    expect(await store.getCached('p1')).toBeNull();
  });

  it('store null devolve null sem erro', async () => {
    const search = vi.fn();
    const service = createPhotoService({ store: null, search, budget: 18, now });
    expect(await service.getPhoto(subject, { allowFetch: true })).toBeNull();
    expect(search).not.toHaveBeenCalled();
    const map = await service.getPhotosCacheOnly([subject]);
    expect(map.get('p1')).toBeNull();
  });

  it('não busca quando casa e nome estão vazios', async () => {
    const { search, service } = setup();
    expect(await service.getPhoto({ id: 'z', name: ' ', house: '' }, { allowFetch: true })).toBeNull();
    expect(search).not.toHaveBeenCalled();
  });

  it('getPhotosCacheOnly combina cache, seen e desconhecido sem buscar', async () => {
    const { store, search, service } = setup();
    await store.saveCached('a', { status: 'found', imageUrl: 'https://x/a.png', matchedName: 'A' });
    await store.addSeen([seenEntry('Dior', 'Sauvage', 'https://x/seen.png', 'edt')]);
    const map = await service.getPhotosCacheOnly([
      { id: 'a', name: 'Whatever', house: 'Other' },
      { id: 'b', name: 'Sauvage', house: 'Dior', concentration: 'EDT' },
      { id: 'c', name: 'Unknown', house: 'Nobody' },
    ]);
    expect(map.get('a')).toBe('https://x/a.png');
    expect(map.get('b')).toBe('https://x/seen.png');
    expect(map.get('c')).toBeNull();
    expect(search).not.toHaveBeenCalled();
  });

  it('getPhotosCacheOnly mostra a foto de seen sem concentração, mas não grava nada', async () => {
    const { store, service } = setup();
    // Resumo da busca: sem concentração. Visto na Fragella: EDP.
    await store.addSeen([seenEntry('Creed', 'Green Irish Tweed', 'https://x/edp.png', 'edp')]);
    const map = await service.getPhotosCacheOnly([{ id: 'git', name: 'Green Irish Tweed', house: 'Creed' }]);
    expect(map.get('git')).toBe('https://x/edp.png');
    expect(await store.getCached('git')).toBeNull();
  });

  it('getPhotosCacheOnly nunca chama saveCached', async () => {
    const { store, service } = setup();
    await store.addSeen([seenEntry('Dior', 'Sauvage', 'https://x/seen.png', 'edt')]);
    const saveSpy = vi.spyOn(store, 'saveCached');
    await service.getPhotosCacheOnly([
      { id: 'b', name: 'Sauvage', house: 'Dior', concentration: 'EDT' },
      { id: 'c', name: 'Sauvage', house: 'Dior' },
    ]);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('getPhotosCacheOnly consulta seen uma vez por marca', async () => {
    const { store, service } = setup();
    await store.addSeen([
      seenEntry('Dior', 'Sauvage', 'https://x/sauvage.png'),
      seenEntry('Dior', 'Fahrenheit', 'https://x/fahr.png'),
      seenEntry('Chanel', 'Bleu de Chanel', 'https://x/bleu.png'),
    ]);
    const findSpy = vi.spyOn(store, 'findSeenByBrand');
    const map = await service.getPhotosCacheOnly([
      { id: '1', name: 'Sauvage', house: 'Dior' },
      { id: '2', name: 'Fahrenheit', house: 'Dior' },
      { id: '3', name: 'Bleu de Chanel', house: 'Chanel' },
    ]);
    expect(findSpy).toHaveBeenCalledTimes(2);
    expect(map.get('1')).toBe('https://x/sauvage.png');
    expect(map.get('2')).toBe('https://x/fahr.png');
    expect(map.get('3')).toBe('https://x/bleu.png');
  });

  it('getPhotosCacheOnly: falha numa marca não atrapalha as outras', async () => {
    const { store, service } = setup();
    await store.addSeen([seenEntry('Chanel', 'Bleu de Chanel', 'https://x/bleu.png')]);
    const original = store.findSeenByBrand.bind(store);
    store.findSeenByBrand = async (brand) => {
      if (brand === 'dior') throw new Error('falhou');
      return original(brand);
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const map = await service.getPhotosCacheOnly([
      { id: '1', name: 'Sauvage', house: 'Dior' },
      { id: '3', name: 'Bleu de Chanel', house: 'Chanel' },
    ]);
    expect(map.get('1')).toBeNull();
    expect(map.get('3')).toBe('https://x/bleu.png');
    spy.mockRestore();
  });

  it('se o store falha, devolve null e registra o erro', async () => {
    const boom = async () => {
      throw new Error('supabase fora do ar');
    };
    const store = {
      getCached: boom,
      getCachedMany: boom,
      saveCached: boom,
      findSeenByBrand: boom,
      addSeen: boom,
      getUsage: boom,
      incrementUsage: boom,
    } as unknown as PhotoStore;
    const search = vi.fn();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = createPhotoService({ store, search, budget: 18, now });
    expect(await service.getPhoto(subject, { allowFetch: true })).toBeNull();
    const map = await service.getPhotosCacheOnly([subject]);
    expect(map.get('p1')).toBeNull();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
