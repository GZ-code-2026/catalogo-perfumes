import 'server-only';
import { isFragellaConfigured, searchFragrances } from '../fragella/client';
import { lerOrcamento } from './budget';
import { createPhotoService, type PhotoService } from './service';
import { createSupabaseStore } from './supabase-store';

let instance: PhotoService | null = null;

// Monta o serviço uma única vez a partir das variáveis de ambiente.
export function getPhotoService(): PhotoService {
  if (instance) return instance;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  instance = createPhotoService({
    store: url && key ? createSupabaseStore(url, key) : null,
    search: isFragellaConfigured() ? searchFragrances : null,
    budget: lerOrcamento(process.env.FRAGELLA_MONTHLY_BUDGET),
  });
  return instance;
}
