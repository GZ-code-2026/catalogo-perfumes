// Pré-preenche as fotos da vitrine da home.
// Uso: npm run seed:photos  (gasta a cota mensal da Fragella)
import { getPerfume, searchPerfumes } from "../src/lib/tenml/client";
import { searchFragrances } from "../src/lib/fragella/client";
import { createPhotoService } from "../src/lib/photos/service";
import { createSupabaseStore } from "../src/lib/photos/supabase-store";
import { assuntoComConcentracao, classificar, lerOrcamento, variaveisFaltando } from "./seed-logic";

const MAX_FALHAS_SEGUIDAS = 3;

async function main() {
  const faltando = variaveisFaltando(process.env);
  if (faltando.length > 0) {
    console.error(`Faltam variáveis no .env.local: ${faltando.join(", ")}`);
    process.exit(1);
  }

  const budget = lerOrcamento(process.env.FRAGELLA_MONTHLY_BUDGET);
  const store = createSupabaseStore(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const service = createPhotoService({ store, search: searchFragrances, budget });
  const mes = new Date().toISOString().slice(0, 7);

  let encontradas = 0;
  let semFoto = 0;
  let falhas = 0;
  let falhasSeguidas = 0;
  let cursor: string | undefined;
  let parar = false;

  try {
    while (!parar) {
      const pagina = await searchPerfumes({ iconic: true, limit: 20, cursor });
      for (const p of pagina.results) {
        // Antes de cada perfume: confere se ainda há orçamento.
        if ((await store.getUsage(mes)) >= budget) {
          console.log("⏸ orçamento esgotado");
          parar = true;
          break;
        }

        const nome = `${p.house} — ${p.name}`;

        // Busca a concentração no detalhe da 10ML; sem ela, a foto poderia ser da versão errada.
        const assunto = await assuntoComConcentracao(p, getPerfume);
        if (!assunto) {
          console.log(`· sem detalhe na 10ML, pulado  ${nome}`);
          continue;
        }

        const url = await service.getPhoto(assunto, { allowFetch: true });
        const cached = url ? null : await store.getCached(p.id);
        const resultado = classificar(url, cached);

        if (resultado === "foto") {
          encontradas++;
          falhasSeguidas = 0;
          console.log(`✔ foto  ${nome}`);
        } else if (resultado === "sem-foto") {
          semFoto++;
          falhasSeguidas = 0;
          console.log(`· sem foto  ${nome}`);
        } else {
          falhas++;
          falhasSeguidas++;
          console.log(`✖ falha ao buscar  ${nome}`);
          if (falhasSeguidas >= MAX_FALHAS_SEGUIDAS) {
            console.log("A Fragella parece indisponível; tente mais tarde.");
            parar = true;
            break;
          }
        }
      }
      if (!pagina.nextCursor) break;
      cursor = pagina.nextCursor;
    }
  } finally {
    let uso = "?";
    try {
      uso = String(await store.getUsage(mes));
    } catch {
      // mantém "?" se o banco não responder
    }
    console.log(
      `\nEncontradas: ${encontradas} | Sem foto: ${semFoto} | Falhas: ${falhas} | Uso do mês: ${uso}/${budget}`,
    );
  }
}

main().catch((erro) => {
  console.error("Erro ao preencher as fotos:", erro);
  process.exit(1);
});
