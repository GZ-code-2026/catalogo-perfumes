import 'server-only';
import { isFragellaConfigured, searchFragrances } from '../fragella/client';
import { lerOrcamento } from './budget';
import { createPhotoService, type PhotoService } from './service';
import type { PhotoStore } from './store';
import { createSupabaseStore } from './supabase-store';

let instance: PhotoService | null = null;

// Cria o store do Supabase; se a configuração estiver errada, segue sem cache
// (o site continua funcionando, só com placeholders no lugar das fotos).
function criarStore(): PhotoStore | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const aviso = 'Configuração do Supabase inválida (confira SUPABASE_URL); seguindo sem cache de fotos.';
  if (!url.startsWith('https://')) {
    console.error(aviso);
    return null;
  }
  try {
    return createSupabaseStore(url, key);
  } catch {
    // Não imprime o erro original para nunca correr o risco de mostrar a chave.
    console.error(aviso);
    return null;
  }
}

// Monta o serviço uma única vez a partir das variáveis de ambiente.
export function getPhotoService(): PhotoService {
  if (instance) return instance;

  instance = createPhotoService({
    store: criarStore(),
    search: isFragellaConfigured() ? searchFragrances : null,
    budget: lerOrcamento(process.env.FRAGELLA_MONTHLY_BUDGET),
  });
  return instance;
}
