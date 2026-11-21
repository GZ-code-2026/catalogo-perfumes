// Decide se um perfume da 10ML e um perfume da Fragella são o mesmo produto.
// As regras são conservadoras de propósito: foto errada é pior que placeholder.

export type Concentration = 'edc' | 'edt' | 'edp' | 'parfum' | 'extrait';

export type Audience = 'men' | 'women';

export interface PhotoKey {
  brand: string;
  name: string;
  concentration: Concentration | null;
  // Público: 'men' / 'women' / null (desconhecido ou unissex).
  audience: Audience | null;
  // true quando o público está escrito no nome ("for men"/"for women").
  audienceExplicit: boolean;
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
  'christian dior': 'dior',
  'giorgio armani': 'armani',
  'paco rabanne': 'rabanne',
  mfk: 'maison francis kurkdjian',
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

// Lê a concentração do final do id da 10ML (ex.: "creed-green-irish-tweed-edp" → "EDP").
// Serve só como dica para mostrar fotos; nunca para gravar no cache.
const ID_SUFFIXES: Record<string, string> = {
  edp: 'EDP',
  edt: 'EDT',
  parfum: 'Parfum',
  extrait: 'Extrait',
  edc: 'EDC',
};

export function concentrationFromId(id: string): string | null {
  const parts = id.toLowerCase().split('-');
  if (parts.length < 2) return null;
  return ID_SUFFIXES[parts[parts.length - 1]] ?? null;
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

// Todas as formas de escrever a marca: como veio, a forma oficial e os apelidos dela.
// Ex.: "Christian Dior" → ["christian dior", "dior"]. As mais longas vêm primeiro.
function brandForms(house: string): string[] {
  const canonical = normalizeBrand(house);
  const forms = new Set([normalizeText(house), canonical]);
  for (const [alias, target] of Object.entries(BRAND_ALIASES)) {
    if (target === canonical) forms.add(alias);
  }
  return [...forms].filter(Boolean).sort((a, b) => b.length - a.length);
}

// Tira do começo do nome, repetidamente, palavras iguais à marca
// ("christian dior dior sauvage" → "sauvage"). Nunca deixa o nome vazio.
function removeLeadingBrand(name: string, forms: string[]): string {
  let result = name;
  let removed = true;
  while (removed) {
    removed = false;
    for (const form of forms) {
      if (result.startsWith(`${form} `)) {
        result = result.slice(form.length + 1).trim();
        removed = true;
        break;
      }
    }
  }
  return result;
}

// Descritores de público tirados só do FINAL do nome. Os neutros ("unisex",
// "for men and women") somem; "for men"/"for women" somem do nome mas viram o
// público da chave, porque "The One" e "The One for Men" são frascos diferentes.
// "pour homme", "femme" etc. ficam, porque podem fazer parte do nome de verdade.
const AUDIENCE_DESCRIPTORS: Array<[string, Audience | null]> = [
  ['for men and women', null],
  ['for women and men', null],
  ['for men', 'men'],
  ['for women', 'women'],
  ['unisex', null],
];

function removeTrailingDescriptors(name: string): { name: string; audience: Audience | null } {
  let result = name;
  let audience: Audience | null = null;
  let removed = true;
  while (removed) {
    removed = false;
    for (const [descriptor, descriptorAudience] of AUDIENCE_DESCRIPTORS) {
      if (result.endsWith(` ${descriptor}`)) {
        result = result.slice(0, -(descriptor.length + 1)).trim();
        audience = audience ?? descriptorAudience;
        removed = true;
        break;
      }
    }
  }
  return { name: result, audience };
}

// Gênero da 10ML ('men' | 'women' | 'unisex'); só 'men' e 'women' viram público.
function audienceFromGender(gender: string | null | undefined): Audience | null {
  const text = normalizeText(gender ?? '');
  return text === 'men' || text === 'women' ? text : null;
}

// Público escrito no nome ("for men"/"for women" no final), ou null.
export function audienceFromName(name: string): Audience | null {
  return removeTrailingDescriptors(removeConcentrationTerms(normalizeText(name))).audience;
}

// Chave de um perfume da 10ML. O gênero (opcional) só vale se o nome não disser o público.
export function toKey(
  house: string,
  name: string,
  concentrationHint?: string | null,
  gender?: string | null,
): PhotoKey {
  const brand = normalizeBrand(house);
  const normalizedName = normalizeText(name);
  const concentration = parseConcentration(concentrationHint) ?? findConcentration(normalizedName);

  const withoutConcentration = removeConcentrationTerms(normalizedName);
  const withoutDescriptors = removeTrailingDescriptors(withoutConcentration);
  const withoutBrand = removeLeadingBrand(withoutDescriptors.name, brandForms(house));

  const audienceExplicit = withoutDescriptors.audience !== null;
  const audience = withoutDescriptors.audience ?? audienceFromGender(gender);

  return { brand, name: withoutBrand, concentration, audience, audienceExplicit };
}

// Chave de um item da Fragella. Aqui a concentração escrita no NOME vence o OilType
// (ex.: "Sauvage Parfum" com OilType "EDP" é Parfum); o OilType só entra se o nome não tiver.
// O público vem só do nome.
export function fragellaKey(item: { brand: string; name: string; oilType?: string | null }): PhotoKey {
  const key = toKey(item.brand, item.name);
  return { ...key, concentration: key.concentration ?? parseConcentration(item.oilType) };
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

  // Públicos conhecidos e diferentes não casam. Se o nome da 10ML diz o público
  // ("The One for Men"), o candidato também precisa dizer.
  if (target.audience && candidate.audience && target.audience !== candidate.audience) return null;
  if (target.audienceExplicit && !candidate.audience) return null;

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

  // Empate só é aceito se for o mesmo produto: mesma imagem, ou mesma chave
  // (marca, nome, concentração e público) fotografada mais de uma vez. Aí fica o primeiro.
  // Chaves diferentes empatadas = ambíguo, melhor não mostrar foto.
  const distinctImages = new Set(best.map((candidate) => candidate.imageUrl));
  const distinctKeys = new Set(
    best.map(
      (candidate) =>
        `${candidate.brand}|${candidate.name}|${candidate.concentration ?? ''}|${candidate.audience ?? ''}`,
    ),
  );
  if (distinctImages.size > 1 && distinctKeys.size > 1) return null;
  return best[0];
}
