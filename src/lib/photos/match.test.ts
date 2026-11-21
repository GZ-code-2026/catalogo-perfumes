import {
  concentrationFromId,
  findMatch,
  fragellaKey,
  jaroWinkler,
  normalizeBrand,
  normalizeText,
  parseConcentration,
  toKey,
} from '@/lib/photos/match';

const c = (house: string, name: string, conc?: string | null) =>
  ({ ...toKey(house, name, conc), imageUrl: `img:${name}:${conc ?? ''}`, rawName: name });

test('normalizeText remove acento e pontuação', () =>
  expect(normalizeText("  L'Immensité ")).toBe('l immensite'));
test('apelido de marca', () =>
  expect(normalizeBrand('YSL')).toBe(normalizeBrand('Yves Saint Laurent')));
test('apelidos D&G e ck', () => {
  expect(normalizeBrand('D&G')).toBe('dolce gabbana');
  expect(normalizeBrand('Dolce and Gabbana')).toBe('dolce gabbana');
  expect(normalizeBrand('CK')).toBe('calvin klein');
  expect(normalizeBrand('JPG')).toBe('jean paul gaultier');
});
test('parseConcentration', () => {
  expect(parseConcentration('EDP')).toBe('edp');
  expect(parseConcentration('Eau de Parfum')).toBe('edp');
  expect(parseConcentration('eau de toilette')).toBe('edt');
  expect(parseConcentration('Cologne')).toBe('edc');
  expect(parseConcentration('Eau de Cologne')).toBe('edc');
  expect(parseConcentration('Parfum')).toBe('parfum');
  expect(parseConcentration('Extrait de Parfum')).toBe('extrait');
  expect(parseConcentration('Extrait')).toBe('extrait');
  expect(parseConcentration(null)).toBeNull();
  expect(parseConcentration('Elixir')).toBeNull();
});
test('toKey extrai concentração do nome', () =>
  expect(toKey('Dior', 'Sauvage Eau de Toilette')).toEqual({
    brand: 'dior',
    name: 'sauvage',
    concentration: 'edt',
    audience: null,
    audienceExplicit: false,
  }));
test('toKey usa hint antes do nome', () =>
  expect(toKey('Dior', 'Sauvage Eau de Parfum', 'EDP').concentration).toBe('edp'));
test('elixir não é concentração', () =>
  expect(toKey('Dior', 'Sauvage Elixir').name).toBe('sauvage elixir'));
test('marca repetida no nome é removida', () =>
  expect(toKey('Chanel', 'Chanel Bleu de Chanel').name).toBe('bleu de chanel'));
test('EDT não casa com EDP', () =>
  expect(findMatch(toKey('Dior', 'Sauvage Eau de Toilette'), [c('Dior', 'Sauvage', 'Eau de Parfum')])).toBeNull());
test('sem concentração conhecida em um lado casa', () =>
  expect(findMatch(toKey('Dior', 'Sauvage'), [c('Dior', 'Sauvage', 'Eau de Parfum')])?.imageUrl).toBe('img:Sauvage:Eau de Parfum'));
test('Bleu de Chanel Parfum não casa com EDP', () =>
  expect(findMatch(toKey('Chanel', 'Bleu de Chanel Parfum'), [c('Chanel', 'Bleu de Chanel', 'EDP')])).toBeNull());
test('Aventus não casa com Aventus for Her', () =>
  expect(findMatch(toKey('Creed', 'Aventus'), [c('Creed', 'Aventus for Her')])).toBeNull());
test('Sauvage não casa com Sauvage Elixir', () =>
  expect(findMatch(toKey('Dior', 'Sauvage', 'EDT'), [c('Dior', 'Sauvage Elixir')])).toBeNull());
test('marca diferente nunca casa', () =>
  expect(findMatch(toKey('Dior', 'Sauvage'), [c('Lattafa', 'Sauvage')])).toBeNull());
test('pequena variação de grafia casa (>=0.9, mesmo nº de palavras)', () =>
  expect(findMatch(toKey('Lancôme', 'La Vie Est Belle'), [c('Lancome', 'La Vie est Bele')])).not.toBeNull());
test('empate entre candidatos com chaves diferentes não casa', () =>
  expect(findMatch(toKey('Dior', 'Sauvage'), [c('Dior', 'Sauvage', null), { ...c('Dior', 'Sauvage', 'EDT'), imageUrl: 'outra' }])).toBeNull());
test('empate com a mesma chave e imagens diferentes escolhe o primeiro', () => {
  const a = c('Dior', 'Sauvage', null);
  expect(findMatch(toKey('Dior', 'Sauvage'), [a, { ...a, imageUrl: 'outra' }])?.imageUrl).toBe(a.imageUrl);
});
test('candidatos com a mesma imageUrl contam como um só', () => {
  const a = c('Dior', 'Sauvage', null);
  expect(findMatch(toKey('Dior', 'Sauvage'), [a, { ...a }])?.imageUrl).toBe(a.imageUrl);
});
test('Acqua di Gio não casa com Acqua di Gioia', () =>
  expect(findMatch(toKey('Armani', 'Acqua di Gio'), [c('Armani', 'Acqua di Gioia')])).toBeNull());
test('nomes vazios nunca casam', () =>
  expect(findMatch(toKey('Dior', 'Parfum'), [c('Dior', 'Eau de Parfum')])).toBeNull());
test('uma palavra com distância 1 casa', () =>
  expect(findMatch(toKey('Creed', 'Silver Mountain Water'), [c('Creed', 'Silver Mountain Wate')])).not.toBeNull());
test('duas palavras diferentes não casam', () =>
  expect(findMatch(toKey('Creed', 'Silver Mountain Water'), [c('Creed', 'Silver Mountains Wate')])).toBeNull());
test('jaroWinkler', () => {
  expect(jaroWinkler('martha', 'marhta')).toBeCloseTo(0.961, 2);
  expect(jaroWinkler('abc', 'abc')).toBe(1);
});

test('concentrationFromId lê a concentração do final do id', () => {
  expect(concentrationFromId('creed-green-irish-tweed-edp')).toBe('EDP');
  expect(concentrationFromId('dior-sauvage-edt')).toBe('EDT');
  expect(concentrationFromId('chanel-no-5-parfum')).toBe('Parfum');
  expect(concentrationFromId('mfk-baccarat-rouge-540-extrait')).toBe('Extrait');
  expect(concentrationFromId('4711-original-edc')).toBe('EDC');
  expect(concentrationFromId('DIOR-SAUVAGE-EDP')).toBe('EDP');
  expect(concentrationFromId('dior-sauvage')).toBeNull();
  expect(concentrationFromId('edp-algo')).toBeNull();
  expect(concentrationFromId('')).toBeNull();
});

// Apelidos, prefixo de marca e descritores de público.
test('novos apelidos de marca', () => {
  expect(normalizeBrand('Christian Dior')).toBe('dior');
  expect(normalizeBrand('Giorgio Armani')).toBe('armani');
  expect(normalizeBrand('Paco Rabanne')).toBe('rabanne');
  expect(normalizeBrand('MFK')).toBe('maison francis kurkdjian');
  expect(normalizeBrand('Maison Francis Kurkdjian')).toBe('maison francis kurkdjian');
});
test('remove a marca do começo do nome em qualquer forma, repetidamente', () => {
  expect(toKey('Dior', 'Christian Dior Dior Sauvage').name).toBe('sauvage');
  expect(toKey('Christian Dior', 'Dior Sauvage').name).toBe('sauvage');
  expect(toKey('Dior', 'Dior').name).toBe('dior');
  expect(toKey('Dior', 'Chirstian Dior Eau Sauvage').name).toBe('chirstian dior eau sauvage');
});
test('remove descritores de público só no final', () => {
  expect(toKey('Dior', 'Balade Sauvage unisex').name).toBe('balade sauvage');
  expect(toKey('Creed', 'Aventus for Men').name).toBe('aventus');
  expect(toKey('X', 'Y for Women').name).toBe('y');
  expect(toKey('X', 'Y for Men and Women').name).toBe('y');
  expect(toKey('X', 'Y for Women and Men').name).toBe('y');
  expect(toKey('X', 'Unisex Y').name).toBe('unisex y');
  expect(toKey('Dior', 'Fahrenheit pour Homme').name).toBe('fahrenheit pour homme');
  expect(toKey('X', 'Y pour Homme et Femme').name).toBe('y pour homme et femme');
  expect(toKey('Dior', 'Dior Homme').name).toBe('homme');
  expect(toKey('X', 'Unisex').name).toBe('unisex');
});
test('fragellaKey: concentração do nome vence o OilType', () => {
  expect(fragellaKey({ brand: 'Dior', name: 'Sauvage Parfum for men', oilType: 'EDP' })).toEqual({
    brand: 'dior',
    name: 'sauvage',
    concentration: 'parfum',
    audience: 'men',
    audienceExplicit: true,
  });
  expect(fragellaKey({ brand: 'Dior', name: 'Sauvage', oilType: 'Eau de Toilette' }).concentration).toBe('edt');
  expect(fragellaKey({ brand: 'Dior', name: 'Sauvage' }).concentration).toBeNull();
});

// Linhas REAIS da Fragella (busca "Dior Sauvage Eau de Parfum"), na ordem recebida.
const REAL_ROWS: Array<[string, string, string | null]> = [
  ['Christian Dior', 'Dior Sauvage', 'edt'],
  ['Christian Dior', 'Dior Sauvage Elixir', 'edp'],
  ['Christian Dior', 'Dior Sauvage Eau Forte', 'edp'],
  ['Christian Dior', 'Dior Sauvage Eau De Toilette', 'edt'],
  ['Dior', 'Dior Sauvage Edt', 'edt'],
  ['Dior', 'Christian Dior Dior Sauvage Edp', 'edp'],
  ['Dior', 'Chirstian Dior Eau Sauvage Edt', 'edt'],
  ['Dior', 'Balade Sauvage unisex', null],
  ['Dior', 'Sauvage Parfum for men', 'edp'],
  ['Dior', 'Eau Sauvage 100% Glacon unisex', null],
];
const realCandidates = REAL_ROWS.map(([brand, name, oilType]) => ({
  ...fragellaKey({ brand, name, oilType }),
  imageUrl: `img:${name}`,
  rawName: name,
}));
const SAUVAGE_EDT = ['Dior Sauvage', 'Dior Sauvage Eau De Toilette', 'Dior Sauvage Edt'];

test('dados reais: Sauvage EDP casa com "Christian Dior Dior Sauvage Edp"', () =>
  expect(findMatch(toKey('Dior', 'Sauvage Eau de Parfum', 'EDP'), realCandidates)?.rawName).toBe(
    'Christian Dior Dior Sauvage Edp',
  ));
test('dados reais: Sauvage EDT casa com uma das linhas Sauvage EDT (a primeira)', () => {
  const match = findMatch(toKey('Dior', 'Sauvage Eau de Toilette', 'EDT'), realCandidates);
  expect(SAUVAGE_EDT).toContain(match?.rawName);
  expect(match?.rawName).toBe('Dior Sauvage');
});
test('dados reais: Sauvage EDP com gênero men (não explícito) continua casando', () =>
  expect(findMatch(toKey('Dior', 'Sauvage Eau de Parfum', 'EDP', 'men'), realCandidates)?.rawName).toBe(
    'Christian Dior Dior Sauvage Edp',
  ));
test('dados reais: Sauvage Parfum com gênero men casa com "Sauvage Parfum for men"', () =>
  expect(findMatch(toKey('Dior', 'Sauvage Parfum', 'Parfum', 'men'), realCandidates)?.rawName).toBe(
    'Sauvage Parfum for men',
  ));
test('dados reais: Sauvage Parfum casa com "Sauvage Parfum for men"', () =>
  expect(findMatch(toKey('Dior', 'Sauvage Parfum', 'Parfum'), realCandidates)?.rawName).toBe(
    'Sauvage Parfum for men',
  ));
test('dados reais: Sauvage Elixir casa com "Dior Sauvage Elixir"', () =>
  expect(findMatch(toKey('Dior', 'Sauvage Elixir', null), realCandidates)?.rawName).toBe('Dior Sauvage Elixir'));
test('dados reais: Eau Sauvage não casa com o nome com erro de digitação', () =>
  expect(findMatch(toKey('Dior', 'Eau Sauvage', 'EDT'), realCandidates)).toBeNull());

// Público (FIX ROUND 2, regra C'): "for men"/"for women" saem do nome mas ficam na chave.
const theOne = (name: string) =>
  ({ ...fragellaKey({ brand: 'Dolce & Gabbana', name, oilType: 'Eau de Parfum' }), imageUrl: `img:${name}`, rawName: name });

test('público: descritores neutros não marcam público; for men/for women marcam', () => {
  expect(toKey('Dior', 'Balade Sauvage unisex')).toMatchObject({ audience: null, audienceExplicit: false });
  expect(toKey('X', 'Y for Men and Women')).toMatchObject({ name: 'y', audience: null, audienceExplicit: false });
  expect(toKey('X', 'Y for Women')).toMatchObject({ name: 'y', audience: 'women', audienceExplicit: true });
  expect(toKey('X', 'Y', null, 'women')).toMatchObject({ audience: 'women', audienceExplicit: false });
  expect(toKey('X', 'Y', null, 'unisex')).toMatchObject({ audience: null, audienceExplicit: false });
  expect(toKey('X', 'Y for Men', null, 'women')).toMatchObject({ audience: 'men', audienceExplicit: true });
  expect(fragellaKey({ brand: 'X', name: 'Y' })).toMatchObject({ audience: null, audienceExplicit: false });
});
test('D&G: "The One for Men" não casa com "The One" (alvo explícito, candidato sem público)', () =>
  expect(findMatch(toKey('Dolce & Gabbana', 'The One for Men', 'EDP'), [theOne('The One')])).toBeNull());
test('D&G: "The One" women não casa com "The One for Men" (públicos diferentes)', () =>
  expect(findMatch(toKey('Dolce & Gabbana', 'The One', 'EDP', 'women'), [theOne('The One for Men')])).toBeNull());
test('D&G: "The One for Men" casa com "The One for Men"', () =>
  expect(findMatch(toKey('Dolce & Gabbana', 'The One for Men', 'EDP'), [theOne('The One for Men')])?.rawName).toBe(
    'The One for Men',
  ));
test('Armani: "Code" men não casa com "Armani Code for Women"', () =>
  expect(
    findMatch(toKey('Armani', 'Code', 'EDP', 'men'), [
      {
        ...fragellaKey({ brand: 'Giorgio Armani', name: 'Armani Code for Women', oilType: 'Eau de Parfum' }),
        imageUrl: 'img:code-women',
        rawName: 'Armani Code for Women',
      },
    ]),
  ).toBeNull());
test('empate entre "for Men" e "for Women" sem gênero no alvo não casa', () =>
  expect(
    findMatch(toKey('Dolce & Gabbana', 'The One', 'EDP'), [theOne('The One for Men'), theOne('The One for Women')]),
  ).toBeNull());
