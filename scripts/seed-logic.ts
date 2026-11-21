// Funções pequenas do seed:photos, separadas para poderem ser testadas.

// Devolve os nomes das variáveis obrigatórias que não estão preenchidas.
export function variaveisFaltando(env: Record<string, string | undefined>): string[] {
  return ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "FRAGELLA_API_KEY"].filter(
    (nome) => !env[nome],
  );
}

// Orçamento mensal: usa 18 se a variável faltar ou não for um número.
export function lerOrcamento(valor: string | undefined): number {
  if (!valor) return 18;
  const n = Number(valor);
  return Number.isFinite(n) ? n : 18;
}

// foto: achou a imagem; sem-foto: a Fragella respondeu e não há foto;
// falha: nada foi guardado (erro da Fragella ou do banco).
export function classificar(
  url: string | null,
  cached: { status: string } | null,
): "foto" | "sem-foto" | "falha" {
  if (url) return "foto";
  if (cached?.status === "none") return "sem-foto";
  return "falha";
}
