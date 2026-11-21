// Pré-preenche as fotos da vitrine da home.
// Uso: npm run seed:photos  (gasta a cota mensal da Fragella)
import { searchPerfumes } from "../src/lib/tenml/client";
import { searchFragrances } from "../src/lib/fragella/client";
import { createPhotoService } from "../src/lib/photos/service";
import { createSupabaseStore } from "../src/lib/photos/supabase-store";

// Devolve os nomes das variáveis obrigatórias que não estão preenchidas.
export function variaveisFaltando(env: NodeJS.ProcessEnv): string[] {
  return ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "FRAGELLA_API_KEY"].filter(
    (nome) => !env[nome],
  );
}

async function main() {
  const faltando = variaveisFaltando(process.env);
  if (faltando.length > 0) {
    console.error(`Faltam variáveis no .env.local: ${faltando.join(", ")}`);
    process.exit(1);
  }

  const orcamento = Number(process.env.FRAGELLA_MONTHLY_BUDGET);
  const budget = Number.isFinite(orcamento) && process.env.FRAGELLA_MONTHLY_BUDGET ? orcamento : 18;

  const store = createSupabaseStore(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const service = createPhotoService({ store, search: searchFragrances, budget });
  const mes = new Date().toISOString().slice(0, 7);

  let encontradas = 0;
  let semFoto = 0;
  let cursor: string | undefined;
  let parar = false;

  while (!parar) {
    const pagina = await searchPerfumes({ iconic: true, limit: 20, cursor });
    for (const p of pagina.results) {
      const foto = await service.getPhoto(p, { allowFetch: true });
      if (foto) {
        encontradas++;
        console.log(`✔ foto  ${p.house} — ${p.name}`);
      } else {
        semFoto++;
        console.log(`· sem foto  ${p.house} — ${p.name}`);
      }
      if ((await store.getUsage(mes)) >= budget) {
        console.log("⏸ orçamento esgotado");
        parar = true;
        break;
      }
    }
    if (!pagina.nextCursor) break;
    cursor = pagina.nextCursor;
  }

  const uso = await store.getUsage(mes);
  console.log(`\nEncontradas: ${encontradas} | Sem foto: ${semFoto} | Uso do mês: ${uso}/${budget}`);
}

main().catch((erro) => {
  console.error("Erro ao preencher as fotos:", erro);
  process.exit(1);
});
