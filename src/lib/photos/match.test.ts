import {
  concentrationFromId,
  findMatch,
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
  expect(toKey('Dior', 'Sauvage Eau de Toilette')).toEqual({ brand: 'dior', name: 'sauvage', concentration: 'edt' }));
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
test('empate entre candidatos não casa', () =>
  expect(findMatch(toKey('Dior', 'Sauvage'), [c('Dior', 'Sauvage', null), { ...c('Dior', 'Sauvage', null), imageUrl: 'outra' }])).toBeNull());
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
