// Decide se um perfume da 10ML e um perfume da Fragella são o mesmo produto.
// As regras são conservadoras de propósito: foto errada é pior que placeholder.

export type Concentration = 'edc' | 'edt' | 'edp' | 'parfum' | 'extrait';

export interface PhotoKey {
  brand: string;
  name: string;
  concentration: Concentration | null;
}

export interface MatchCandidate extends PhotoKey {
  imageUrl: string;
  rawName: string;
}

// minúsculas, sem acento, pontuação vira espaço, espaços colapsados
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const BRAND_ALIASES: Record<string, string> = {
  ysl: 'yves saint laurent',
  'd g': 'dolce gabbana',
  'dolce and gabbana': 'dolce gabbana',
  ck: 'calvin klein',
  jpg: 'jean paul gaultier',
};

export function normalizeBrand(s: string): string {
  const text = normalizeText(s);
  return BRAND_ALIASES[text] ?? text;
}

// Os termos mais longos vêm primeiro ("eau de parfum" antes de "parfum").
const CONCENTRATION_TERMS: Array<[string, Concentration]> = [
  ['extrait de parfum', 'extrait'],
  ['extrait', 'extrait'],
  ['eau de parfum', 'edp'],
  ['edp', 'edp'],
  ['eau de toilette', 'edt'],
  ['edt', 'edt'],
  ['eau de cologne', 'edc'],
  ['cologne', 'edc'],
  ['edc', 'edc'],
  ['parfum', 'parfum'],
];

// Procura um termo de concentração como palavras inteiras num texto já normalizado.
function findConcentration(normalized: string): Concentration | null {
  const padded = ` ${normalized} `;
  for (const [term, concentration] of CONCENTRATION_TERMS) {
    if (padded.includes(` ${term} `)) return concentration;
  }
  return null;
}

export function parseConcentration(s: string | null | undefined): Concentration | null {
  if (!s) return null;
  return findConcentration(normalizeText(s));
}

function removeConcentrationTerms(normalized: string): string {
  let result = ` ${normalized} `;
  for (const [term] of CONCENTRATION_TERMS) {
    result = result.split(` ${term} `).join(' ');
  }
  return result.replace(/\s+/g, ' ').trim();
}

function removeLeadingBrand(name: string, brands: string[]): string {
  for (const brand of brands) {
    if (brand && name.startsWith(`${brand} `)) return name.slice(brand.length + 1).trim();
  }
  return name;
}

export function toKey(house: string, name: string, concentrationHint?: string | null): PhotoKey {
  const brand = normalizeBrand(house);
  const normalizedName = normalizeText(name);
  const concentration = parseConcentration(concentrationHint) ?? findConcentration(normalizedName);

  const withoutConcentration = removeConcentrationTerms(normalizedName);
  const withoutBrand = removeLeadingBrand(withoutConcentration, [brand, normalizeText(house)]);

  return { brand, name: withoutBrand || withoutConcentration, concentration };
}

export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatched: boolean[] = new Array(a.length).fill(false);
  const bMatched: boolean[] = new Array(b.length).fill(false);

  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - window);
    const end = Math.min(b.length - 1, i + window);
    for (let j = start; j <= end; j++) {
      if (!bMatched[j] && a[i] === b[j]) {
        aMatched[i] = true;
        bMatched[j] = true;
        matches++;
        break;
      }
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

  let prefix = 0;
  while (prefix < 4 && prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;

  return jaro + prefix * 0.1 * (1 - jaro);
}

function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

// Nomes iguais, ou com o mesmo número de palavras e no máximo UMA palavra
// diferente, e essa diferença é de só 1 letra (palavras com 4+ letras).
function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;

  const wordsA = a.split(' ');
  const wordsB = b.split(' ');
  if (wordsA.length !== wordsB.length) return false;

  let differentPairs = 0;
  for (let i = 0; i < wordsA.length; i++) {
    if (wordsA[i] === wordsB[i]) continue;
    differentPairs++;
    if (differentPairs > 1) return false;
    if (wordsA[i].length < 4 || wordsB[i].length < 4) return false;
    if (levenshtein(wordsA[i], wordsB[i]) > 1) return false;
  }
  return true;
}

// Nota de 0 a 1 para o candidato, ou null se ele não serve.
function scoreCandidate(target: PhotoKey, candidate: MatchCandidate): number | null {
  if (target.brand !== candidate.brand) return null;

  if (target.concentration && candidate.concentration && target.concentration !== candidate.concentration) {
    return null;
  }

  if (!namesMatch(target.name, candidate.name)) return null;
  return target.name === candidate.name ? 1 : jaroWinkler(target.name, candidate.name);
}

export function findMatch(target: PhotoKey, candidates: MatchCandidate[]): MatchCandidate | null {
  let bestScore = 0;
  let best: MatchCandidate[] = [];

  for (const candidate of candidates) {
    const score = scoreCandidate(target, candidate);
    if (score === null) continue;
    if (score > bestScore) {
      bestScore = score;
      best = [candidate];
    } else if (score === bestScore) {
      best.push(candidate);
    }
  }

  if (best.length === 0) return null;

  // Candidatos com a mesma imagem contam como um só; imagens diferentes empatadas = ambíguo.
  const distinctImages = new Set(best.map((candidate) => candidate.imageUrl));
  if (distinctImages.size > 1) return null;
  return best[0];
}
