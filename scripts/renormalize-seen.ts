// Recalcula as chaves de fragella_seen com as regras de correspondência atuais
// e apaga os "sem foto" do cache, para eles serem tentados de novo.
// Uso: npm run renormalize:seen  (NÃO chama a Fragella, não gasta cota)
import { createClient } from "@supabase/supabase-js";
import { planejarRenormalizacao, type LinhaSeen } from "./renormalize-logic";

const TAMANHO_PAGINA = 1000;

async function main() {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    console.error("Faltam variáveis no .env.local: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const db = createClient(url, chave, { auth: { persistSession: false } });

  // Lê todas as linhas, de página em página.
  const linhas: LinhaSeen[] = [];
  for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
    const { data, error } = await db
      .from("fragella_seen")
      .select("id, raw_brand, raw_name, concentration, image_url, brand_norm, name_norm")
      .order("id")
      .range(inicio, inicio + TAMANHO_PAGINA - 1);
    if (error) throw new Error(`Falha ao ler fragella_seen: ${error.message}`);
    linhas.push(...(data ?? []));
    if (!data || data.length < TAMANHO_PAGINA) break;
  }

  const plano = planejarRenormalizacao(linhas);

  // Apaga primeiro as duplicadas, para liberar as chaves.
  let apagadas = 0;
  for (const id of plano.apagar) {
    const { error } = await db.from("fragella_seen").delete().eq("id", id);
    if (error) throw new Error(`Falha ao apagar fragella_seen: ${error.message}`);
    apagadas++;
  }

  let atualizadas = 0;
  for (const { id, ...nova } of plano.atualizar) {
    const { error } = await db.from("fragella_seen").update(nova).eq("id", id);
    if (error?.code === "23505") {
      // Ainda ficaria duplicada no banco: apaga esta linha.
      const apagar = await db.from("fragella_seen").delete().eq("id", id);
      if (apagar.error) throw new Error(`Falha ao apagar fragella_seen: ${apagar.error.message}`);
      apagadas++;
    } else if (error) {
      throw new Error(`Falha ao atualizar fragella_seen: ${error.message}`);
    } else {
      atualizadas++;
    }
  }

  const { error, count } = await db
    .from("photo_cache")
    .delete({ count: "exact" })
    .eq("status", "none");
  if (error) throw new Error(`Falha ao limpar photo_cache: ${error.message}`);

  console.log(
    `Linhas lidas: ${linhas.length} | Atualizadas: ${atualizadas} | Duplicadas apagadas: ${apagadas} | "Sem foto" apagados do cache: ${count ?? 0}`,
  );
}

main().catch((erro) => {
  console.error("Erro ao renormalizar:", erro);
  process.exit(1);
});
