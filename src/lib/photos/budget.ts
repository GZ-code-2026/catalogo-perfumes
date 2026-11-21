// Orçamento mensal da Fragella (FRAGELLA_MONTHLY_BUDGET).
// Usa 18 se a variável faltar, estiver vazia ou não for um número.
export function lerOrcamento(valor: string | undefined): number {
  if (!valor || valor.trim() === "") return 18;
  const n = Number(valor);
  return Number.isFinite(n) ? n : 18;
}
