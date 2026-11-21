import { createClient } from '@supabase/supabase-js';
import type { MatchCandidate } from './match';
import type { CachedPhoto, PhotoStore } from './store';

type PhotoStatus = CachedPhoto['status'];

export function createSupabaseStore(url: string, serviceKey: string): PhotoStore {
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  return {
    async getCached(tenmlId) {
      const { data, error } = await db
        .from('photo_cache')
        .select('status, image_url')
        .eq('tenml_id', tenmlId)
        .maybeSingle();
      if (error) throw new Error(`Falha ao ler photo_cache: ${error.message}`);
      if (!data) return null;
      return { status: data.status as PhotoStatus, imageUrl: data.image_url };
    },

    async getCachedMany(tenmlIds) {
      const result = new Map<string, CachedPhoto>();
      if (tenmlIds.length === 0) return result;
      const { data, error } = await db
        .from('photo_cache')
        .select('tenml_id, status, image_url')
        .in('tenml_id', tenmlIds);
      if (error) throw new Error(`Falha ao ler photo_cache: ${error.message}`);
      for (const row of data ?? []) {
        result.set(row.tenml_id, { status: row.status as PhotoStatus, imageUrl: row.image_url });
      }
      return result;
    },

    async saveCached(tenmlId, entry) {
      const { error } = await db.from('photo_cache').upsert(
        {
          tenml_id: tenmlId,
          status: entry.status,
          image_url: entry.imageUrl,
          matched_name: entry.matchedName,
        },
        { onConflict: 'tenml_id' },
      );
      if (error) throw new Error(`Falha ao salvar photo_cache: ${error.message}`);
    },

    async findSeenByBrand(brand) {
      const { data, error } = await db
        .from('fragella_seen')
        .select('brand_norm, name_norm, concentration, image_url, raw_name')
        .eq('brand_norm', brand);
      if (error) throw new Error(`Falha ao ler fragella_seen: ${error.message}`);
      return (data ?? []).map(
        (row): MatchCandidate => ({
          brand: row.brand_norm,
          name: row.name_norm,
          concentration: row.concentration as MatchCandidate['concentration'],
          imageUrl: row.image_url,
          rawName: row.raw_name,
        }),
      );
    },

    async addSeen(items) {
      // O índice único usa coalesce(concentration, ''), então o PostgREST não
      // consegue usá-lo em onConflict. Inserimos um a um e ignoramos o erro
      // de duplicado (código 23505).
      for (const item of items) {
        const { error } = await db.from('fragella_seen').insert({
          brand_norm: item.brand,
          name_norm: item.name,
          concentration: item.concentration,
          image_url: item.imageUrl,
          raw_name: item.rawName,
          raw_brand: item.rawBrand,
        });
        if (error && error.code !== '23505') {
          throw new Error(`Falha ao salvar fragella_seen: ${error.message}`);
        }
      }
    },

    async getUsage(month) {
      const { data, error } = await db
        .from('fragella_usage')
        .select('count')
        .eq('month', month)
        .maybeSingle();
      if (error) throw new Error(`Falha ao ler fragella_usage: ${error.message}`);
      return data?.count ?? 0;
    },

    async incrementUsage(month) {
      const { data, error } = await db.rpc('increment_fragella_usage', { p_month: month });
      if (error) throw new Error(`Falha ao incrementar uso da Fragella: ${error.message}`);
      return data as number;
    },
  };
}
