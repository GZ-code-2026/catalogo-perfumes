// Percorre todo o catálogo da 10ML e guarda os termos em inglês (famílias,
// acordes e notas) em data/terms-en.json. Rode com: npm run collect:terms
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.TENML_BASE_URL || "https://mcp.10ml.com/api/v1";
const PAUSA_MS = 500;
const TENTATIVAS = 3;

const familias = new Set<string>();
const acordes = new Set<string>();
const notas = new Set<string>();

function guardar(conjunto: Set<string>, valor: unknown) {
  if (typeof valor !== "string") return;
  const limpo = valor.trim().toLowerCase().replace(/\s+/g, " ");
  if (limpo) conjunto.add(limpo);
}

function guardarLista(conjunto: Set<string>, lista: unknown) {
  if (Array.isArray(lista)) lista.forEach((v) => guardar(conjunto, v));
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function buscarPagina(cursor: string | null) {
  const url =
    `${BASE}/perfumes?limit=20&format=detailed` +
    (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
  for (let i = 1; i <= TENTATIVAS; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`status ${res.status}`);
      return await res.json();
    } catch (erro) {
      if (i === TENTATIVAS) {
        throw new Error(
          `Falha ao buscar ${url} após ${TENTATIVAS} tentativas: ${erro}`,
        );
      }
      await esperar(PAUSA_MS * 4 * i);
    }
  }
}

async function main() {
  let cursor: string | null = null;
  let pagina = 0;
  do {
    const dados = await buscarPagina(cursor);
    for (const p of dados.results ?? []) {
      guardar(familias, p.family);
      guardarLista(acordes, p.accords);
      guardarLista(notas, p.key_notes);
      guardarLista(notas, p.pyramid?.top);
      guardarLista(notas, p.pyramid?.heart);
      guardarLista(notas, p.pyramid?.base);
    }
    cursor = dados.next_cursor ?? null;
    pagina++;
    if (pagina % 20 === 0) {
      console.log(
        `página ${pagina}: ${familias.size} famílias, ${acordes.size} acordes, ${notas.size} notas`,
      );
    }
    if (cursor) await esperar(PAUSA_MS);
  } while (cursor);

  const ordenar = (c: Set<string>) => [...c].sort((a, b) => a.localeCompare(b));
  mkdirSync("data", { recursive: true });
  writeFileSync(
    "data/terms-en.json",
    JSON.stringify(
      { family: ordenar(familias), accord: ordenar(acordes), note: ordenar(notas) },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Pronto: ${pagina} páginas, ${familias.size} famílias, ${acordes.size} acordes, ${notas.size} notas`,
  );
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
