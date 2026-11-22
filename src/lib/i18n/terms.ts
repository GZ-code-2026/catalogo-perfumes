import ptTerms from "./pt-terms.json";

export type TermKind =
  | "family"
  | "accord"
  | "note"
  | "season"
  | "occasion"
  | "style"
  | "gender";

const dicionario = ptTerms as Record<TermKind, Record<string, string>>;

// Traduz um termo da 10ML para pt-BR. Sem tradução, devolve o original.
export function t(kind: TermKind, en: string): string {
  const chave = en.trim().toLowerCase().replace(/\s+/g, " ");
  const pt = dicionario[kind]?.[chave];
  if (!pt) return en;
  const primeira = en.trim().charAt(0);
  const maiuscula = primeira !== primeira.toLowerCase();
  return maiuscula ? pt.charAt(0).toUpperCase() + pt.slice(1) : pt;
}
