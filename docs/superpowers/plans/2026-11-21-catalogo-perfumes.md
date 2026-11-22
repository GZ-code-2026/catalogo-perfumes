# Catálogo de Perfumes — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Site Next.js onde se busca um perfume pelo nome e se vê a ficha (dados da 10ML, foto da Fragella com cache no Supabase), publicado na Vercel.

**Architecture:** Next.js App Router. Páginas como Server Components, que chamam a 10ML pelo servidor. Um serviço de fotos, só no servidor, consulta o cache no Supabase e, se for permitido e houver orçamento, a Fragella, casando nomes de forma conservadora. O navegador nunca fala com as APIs externas.

**Tech Stack:** Next.js (versão estável atual, App Router, TypeScript, `src/`), Tailwind CSS, Vitest + Testing Library, Playwright, `@supabase/supabase-js`, `tsx` para scripts.

**Spec:** `docs/superpowers/specs/2026-11-21-catalogo-perfumes-design.md` (leia junto com este plano)

**Público:** o dono é iniciante e está aprendendo Claude Code. Ao executar, explique em português, em 1 ou 2 frases, o que cada tarefa fez e por quê.

## Global Constraints

- Toda a interface em português (pt-BR). `<html lang="pt-BR">`.
- Crédito em **todas** as páginas, texto exato: `Data: 10ML Fragrance Index`, com link para `https://10ml.com/perfume-api`.
- A chave da Fragella (`FRAGELLA_API_KEY`) e a `SUPABASE_SERVICE_ROLE_KEY` só podem ser lidas em código de servidor. Nunca use o prefixo `NEXT_PUBLIC_`. `import "server-only"` fica **apenas** em `src/lib/photos/index.ts` e `src/lib/photos/cards.ts`, que são as portas de entrada usadas pelas páginas. Os módulos de baixo nível (`tenml/client`, `fragella/client`, `photos/*-store`, `photos/service`, `photos/match`) ficam sem esse import, para os scripts em `scripts/` poderem usá-los. Componentes client (`"use client"`) nunca importam nada de `src/lib/` além de `i18n/terms`, `photos/cards` (só o tipo `CardData`, via `import type`) e `components/BottlePlaceholder`.
- Variáveis de ambiente: `FRAGELLA_API_KEY`, `FRAGELLA_MONTHLY_BUDGET` (padrão `18`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TENML_BASE_URL` (padrão `https://mcp.10ml.com/api/v1`), `FRAGELLA_BASE_URL` (padrão `https://api.fragella.com/api/v1`).
- Sem Fragella ou sem Supabase configurados, o app funciona normalmente e mostra apenas placeholders.
- **Nenhum teste chama a Fragella ou a 10ML de verdade.** Use `fetch` simulado ou o servidor mock do E2E.
- Busca na Fragella: `GET /fragrances?search=<house> <name>&limit=10`, header `x-api-key`. Só respostas 2xx contam como uso.
- Timeout de 8 s em toda chamada externa (`AbortSignal.timeout(8000)`).
- Cache Next da 10ML: detalhe `revalidate: 86400`, busca/vitrine `revalidate: 300`.
- Código simples e legível para iniciante. Sem abstrações além das definidas aqui.
- Imagens: `next/image` com `remotePatterns` para `cdn.fragella.com`.
- Commits pequenos, em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Busca com acento, apóstrofo ou `&`** (ex.: `L'Immensité`, `Dolce & Gabbana`): a query é codificada com `URLSearchParams` e funciona. O texto aparece sem caracteres estranhos (UTF-8). → teste na Tarefa 2.
2. **10ML fora do ar ou lenta:** página de erro amigável com "Tentar de novo", nunca tela branca nem stack trace. → testes nas Tarefas 2 e 11.
3. **Fragella responde 429/5xx/JSON inesperado:** foto `null`, uso não incrementado, nada gravado no cache, a página renderiza. → teste na Tarefa 6.
4. **Perfume com perfil `core`** (sem pirâmide, ano, estações, fixação): as seções somem e nunca aparecem "undefined" ou listas vazias. → teste na Tarefa 9.
5. **URL de imagem quebrada no CDN** (404): o card troca para o frasco ilustrado (`onError`). → teste na Tarefa 9.

---

## Estrutura de arquivos

```
src/
  app/
    layout.tsx                 fontes, tema, rodapé
    page.tsx                   início: busca + vitrine
    busca/page.tsx             resultados
    perfume/[id]/page.tsx      detalhe
    perfume/[id]/not-found.tsx
    error.tsx                  erro amigável
    robots.ts
    api/sugestoes/route.ts     sugestões enquanto digita
    api/busca/route.ts         "carregar mais"
  components/
    Footer.tsx  BottlePlaceholder.tsx  PerfumeImage.tsx  PerfumeCard.tsx
    Pyramid.tsx  Accords.tsx  SearchBox.tsx  LoadMore.tsx
  lib/
    tenml/types.ts  tenml/client.ts
    fragella/client.ts
    photos/match.ts  photos/store.ts  photos/supabase-store.ts  photos/memory-store.ts
    photos/service.ts  photos/index.ts  photos/cards.ts
    bots.ts
    i18n/pt-terms.json  i18n/terms.ts
scripts/ collect-terms.ts  seed-photos.ts
data/terms-en.json
supabase/migrations/0001_init.sql
e2e/ mock-server.mjs  fixtures/*.json  busca.spec.ts
```

---

### Task 0: Ambiente e esqueleto do projeto

**Files:**
- Create: projeto Next.js na raiz do repositório (que já existe, com `docs/`), `vitest.config.ts`, `vitest.setup.ts`, `.env.example`, `src/lib/smoke.test.ts`
- Modify: `package.json` (scripts `test`, `test:e2e`, `seed:photos`, `collect:terms`)

**Interfaces:**
- Produces: `npm test` (Vitest, ambiente jsdom, Testing Library + jest-dom configurados), alias `@/` → `src/`.

- [ ] **Step 1: Node.js (ação do dono).** Verifique com `node --version`. Se não houver, peça ao dono para instalar o Node.js LTS em https://nodejs.org e reabrir o VS Code. Pare até que `node --version` mostre ≥ 22.
- [ ] **Step 2: Criar o app** com `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`, numa pasta temporária, e mover o conteúdo para a raiz, preservando `docs/` e `.git`. Confirme que `.gitignore` contém `node_modules`, `.next`, `.env*.local`.
- [ ] **Step 3: Instalar** `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event tsx server-only @supabase/supabase-js` e `@playwright/test` (dev, exceto supabase e server-only). Configure o Vitest com jsdom, alias `@` e setup com jest-dom. No Vitest, `server-only` precisa ser um alias para um módulo vazio.
- [ ] **Step 4: Teste de fumaça** `src/lib/smoke.test.ts`: `expect(1 + 1).toBe(2)`. Rode `npm test`. Esperado: 1 teste passando.
- [ ] **Step 5:** Crie `.env.example` com as 6 variáveis das Global Constraints (valores vazios ou padrões). Rode `npm run build`. Esperado: build ok.
- [ ] **Step 6: Commit** `chore: esqueleto Next.js com Vitest`.

---

### Task 1: Normalização e correspondência de nomes

**Files:**
- Create: `src/lib/photos/match.ts`
- Test: `src/lib/photos/match.test.ts`

**Interfaces:**
- Produces:
  - `type Concentration = 'edc' | 'edt' | 'edp' | 'parfum' | 'extrait'`
  - `normalizeText(s: string): string` — minúsculas, sem acento (NFD + remover diacríticos), pontuação vira espaço, espaços colapsados, trim.
  - `normalizeBrand(s: string): string` — `normalizeText` + apelidos: `ysl`→`yves saint laurent`, `d&g`/`d g`→`dolce gabbana`, `dolce and gabbana`→`dolce gabbana`, `ck`→`calvin klein`, `jpg`→`jean paul gaultier`.
  - `parseConcentration(s: string | null | undefined): Concentration | null` — aceita `EDP`, `Eau de Parfum`, `Eau de Toilette`, `EDT`, `Cologne`, `Eau de Cologne`, `EDC`, `Parfum`, `Extrait`, `Extrait de Parfum` (sem diferenciar maiúsculas).
  - `interface PhotoKey { brand: string; name: string; concentration: Concentration | null }`
  - `toKey(house: string, name: string, concentrationHint?: string | null): PhotoKey` — a concentração vem do hint ou, se ele faltar, do nome. Remove do nome os termos de concentração e a marca repetida no início. **`elixir`, `intense`, `absolu` etc. NÃO são concentração e ficam no nome.**
  - `jaroWinkler(a: string, b: string): number` (0..1, implementação própria)
  - `interface MatchCandidate extends PhotoKey { imageUrl: string; rawName: string }`
  - `findMatch(target: PhotoKey, candidates: MatchCandidate[]): MatchCandidate | null`

- [ ] **Step 1: Testes que falham** em `match.test.ts`:

```ts
const c = (house: string, name: string, conc?: string | null) =>
  ({ ...toKey(house, name, conc), imageUrl: `img:${name}:${conc ?? ''}`, rawName: name });

test('normalizeText remove acento e pontuação', () =>
  expect(normalizeText("  L'Immensité ")).toBe('l immensite'));
test('apelido de marca', () =>
  expect(normalizeBrand('YSL')).toBe(normalizeBrand('Yves Saint Laurent')));
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
test('jaroWinkler', () => { expect(jaroWinkler('martha', 'marhta')).toBeCloseTo(0.961, 2); expect(jaroWinkler('abc', 'abc')).toBe(1); });
```

- [ ] **Step 2:** `npm test -- match`. Esperado: FAIL (módulo não existe).
- [ ] **Step 3: Implemente `match.ts`.** Regra do `findMatch`: marca igual; nome igual **ou** (`jaroWinkler ≥ 0.9` **e** mesmo número de palavras); se as duas concentrações forem conhecidas e diferentes, descarta. Entre os que passarem, maior score (igual = 1). Se houver empate no topo com `imageUrl` diferentes, retorna `null`. Candidatos com a mesma `imageUrl` contam como um só.
- [ ] **Step 4:** `npm test -- match`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: correspondência conservadora de nomes de perfume`.

---

### Task 2: Cliente da 10ML

**Files:**
- Create: `src/lib/tenml/types.ts`, `src/lib/tenml/client.ts`
- Test: `src/lib/tenml/client.test.ts`, fixtures em `src/lib/tenml/__fixtures__/` (copie o formato real: `search.json` = `{total, results[], next_cursor, ...}`; `detail.json` = `{found, exact, perfume{...}, similar[...]}`. Exemplo real em `GET /perfumes/sauvage?format=detailed`)

**Interfaces:**
- Produces (`types.ts`):

```ts
export interface PerfumeSummary {
  id: string; name: string; house: string; year?: number;
  gender?: 'men' | 'women' | 'unisex'; family?: string;
  accords: string[]; keyNotes: string[]; character?: string;
}
export interface SimilarItem { id: string; name: string; house: string; closeness?: string; sharedNotes: string[] }
export interface PerfumeDetail extends PerfumeSummary {
  concentration?: string;
  pyramid?: { top: string[]; heart: string[]; base: string[] };
  seasons: string[]; occasions: string[]; styles: string[];
  longevity?: number; projection?: number; perfumers: string[];
  similar: SimilarItem[];
}
export interface SearchPage { results: PerfumeSummary[]; nextCursor: string | null; total: number }
```

- Produces (`client.ts`):
  - `class TenmlError extends Error {}`
  - `searchPerfumes(p: { q?: string; iconic?: boolean; limit?: number; cursor?: string }): Promise<SearchPage>`: `GET {base}/perfumes`. `limit` padrão 20. Mapeia `key_notes`→`keyNotes` e `next_cursor`→`nextCursor`. `revalidate: 300`.
  - `getPerfume(id: string): Promise<PerfumeDetail | null>`: `GET {base}/perfumes/{encodeURIComponent(id)}?format=detailed`. Retorna `null` se HTTP 404, se `found === false` ou se `exact === false`. `similar` vem do campo `similar` da raiz (`shared_notes`→`sharedNotes`). Arrays ausentes viram `[]`. `revalidate: 86400`.
  - Qualquer outro status não-2xx, erro de rede, timeout ou JSON inválido → lança `TenmlError`.

- [ ] **Step 1: Testes que falham** (mock de `global.fetch` com `vi.fn`):
  - `searchPerfumes({ q: "L'Immensité & co" })` chama uma URL que contém `q=L%27Immensit%C3%A9+%26+co` e devolve `results[0].keyNotes` igual a `key_notes` da fixture, além de `nextCursor === 'bzM'`.
  - `searchPerfumes({ iconic: true, cursor: 'x' })` inclui `iconic=true&cursor=x`.
  - `getPerfume('dior-sauvage-edp')` → `pyramid.top` igual ao da fixture, `similar.length === 5`, `similar[0].sharedNotes` preenchido.
  - `getPerfume` com `exact: false` → `null`; com HTTP 404 → `null`.
  - `getPerfume` com perfil core (sem `pyramid`, `seasons`, `perfumers`) → `pyramid` undefined e `seasons`/`perfumers` iguais a `[]`.
  - HTTP 500 → rejeita com `TenmlError`; `fetch` rejeitando (rede) → `TenmlError`.
- [ ] **Step 2:** `npm test -- tenml`. Esperado: FAIL.
- [ ] **Step 3:** Implemente `types.ts` e `client.ts` conforme as interfaces. Use `URLSearchParams` e `{ signal: AbortSignal.timeout(8000), next: { revalidate } }`.
- [ ] **Step 4:** `npm test -- tenml`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: cliente da API 10ML`.

---

### Task 3: Cliente da Fragella

**Files:**
- Create: `src/lib/fragella/client.ts`
- Test: `src/lib/fragella/client.test.ts`

**Interfaces:**
- Produces:
  - `interface FragellaItem { name: string; brand: string; oilType?: string; imageUrl?: string; imageUrlTransparent?: string }` (mapeia `Name`, `Brand`, `OilType`, `Image URL`, `Image URL Transparent`)
  - `isFragellaConfigured(): boolean` (verifica se `FRAGELLA_API_KEY` está definida)
  - `searchFragrances(query: string): Promise<FragellaItem[] | null>`: `null` em erro de rede, não-2xx, JSON que não é array/`{data:[]}` ou chave ausente; `[]` em 2xx vazio. Itens sem `Name`/`Brand` são descartados.
  - `pickImage(item: FragellaItem): string | null`: prefere `imageUrlTransparent`, depois `imageUrl`. Só aceita URLs `https://`.

- [ ] **Step 1: Testes que falham:** header `x-api-key` enviado; URL com `search=Dior+Sauvage&limit=10`; mapeamento de campos; 429 → `null`; 500 → `null`; corpo `{"erro":1}` → `null`; 200 `[]` → `[]`; `pickImage` prefere a transparente e devolve `null` sem nenhuma URL.
- [ ] **Step 2:** `npm test -- fragella`. Esperado: FAIL.
- [ ] **Step 3:** Implemente. A chave e a base são lidas de `process.env` dentro da função (não no topo do módulo), para os testes poderem trocar.
- [ ] **Step 4:** `npm test -- fragella`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: cliente da API Fragella`.

---

### Task 4: Armazenamento do cache de fotos

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `src/lib/photos/store.ts`, `src/lib/photos/memory-store.ts`, `src/lib/photos/supabase-store.ts`
- Test: `src/lib/photos/memory-store.test.ts`

**Interfaces:**
- Consumes: `MatchCandidate`, `Concentration` (Tarefa 1).
- Produces (`store.ts`):

```ts
export interface CachedPhoto { status: 'found' | 'none'; imageUrl: string | null }
export interface PhotoStore {
  getCached(tenmlId: string): Promise<CachedPhoto | null>;
  getCachedMany(tenmlIds: string[]): Promise<Map<string, CachedPhoto>>;
  saveCached(tenmlId: string, entry: CachedPhoto & { matchedName: string | null }): Promise<void>;
  findSeenByBrand(brand: string): Promise<MatchCandidate[]>;   // brand já normalizada
  addSeen(items: (MatchCandidate & { rawBrand: string })[]): Promise<void>; // ignora duplicados (brand,name,concentration,imageUrl)
  getUsage(month: string): Promise<number>;                    // 'YYYY-MM'
  incrementUsage(month: string): Promise<number>;              // atômico, retorna novo total
}
```

  - `createMemoryStore(): PhotoStore` (para testes)
  - `createSupabaseStore(url: string, serviceKey: string): PhotoStore`
- SQL: tabelas da spec. `fragella_seen` ganha a coluna `concentration text null` e um índice único em `(brand_norm, name_norm, coalesce(concentration,''), image_url)`. Função `increment_fragella_usage(p_month text) returns int` com `insert ... on conflict (month) do update set count = fragella_usage.count + 1 returning count`. RLS habilitado nas 3 tabelas, sem políticas.

- [ ] **Step 1: Testes que falham** para o memory store: `getCached` de id desconhecido → `null`; `saveCached` seguido de `getCached` devolve o mesmo status e URL; `getCachedMany` devolve só os existentes; `addSeen` duplicado não duplica `findSeenByBrand`; `incrementUsage('2026-11')` duas vezes → 2, e `getUsage('2026-12')` → 0.
- [ ] **Step 2:** `npm test -- memory-store`. Esperado: FAIL.
- [ ] **Step 3:** Implemente `store.ts`, `memory-store.ts`, o SQL e `supabase-store.ts`: `upsert` com `onConflict: 'tenml_id'` no cache, `upsert` com `ignoreDuplicates` no seen e `rpc('increment_fragella_usage')`. O Supabase store não tem teste unitário. Ele é verificado na Tarefa 13 contra o banco real.
- [ ] **Step 4:** `npm test -- memory-store`. Esperado: PASS. Rode `npx tsc --noEmit`. Esperado: sem erros.
- [ ] **Step 5: Commit** `feat: armazenamento do cache de fotos (memória e Supabase)`.

---

### Task 5: Detecção de robôs

**Files:**
- Create: `src/lib/bots.ts`
- Test: `src/lib/bots.test.ts`

**Interfaces:**
- Produces: `isBot(userAgent: string | null | undefined): boolean`. UA vazio ou ausente → `true` (conservador). Regex sem diferenciar maiúsculas: `bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|discord|slack|twitter|preview|headless|lighthouse|curl|wget|python|axios|node-fetch|go-http`.

- [ ] **Step 1: Testes que falham:** `Googlebot/2.1` → true; `WhatsApp/2.23` → true; `facebookexternalhit/1.1` → true; `''` → true; `null` → true; UA do Chrome desktop e UA do Safari iPhone → false.
- [ ] **Step 2:** `npm test -- bots`. Esperado: FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** `npm test -- bots`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: detecção de robôs`.

---

### Task 6: Serviço de fotos

**Files:**
- Create: `src/lib/photos/service.ts`, `src/lib/photos/index.ts`
- Test: `src/lib/photos/service.test.ts`

**Interfaces:**
- Consumes: `toKey`, `findMatch`, `MatchCandidate` (T1); `FragellaItem`, `pickImage`, `searchFragrances`, `isFragellaConfigured` (T3); `PhotoStore`, `createSupabaseStore` (T4).
- Produces:

```ts
export interface PhotoSubject { id: string; name: string; house: string; concentration?: string }
export interface PhotoService {
  getPhoto(p: PhotoSubject, opts: { allowFetch: boolean }): Promise<string | null>;
  getPhotosCacheOnly(ps: PhotoSubject[]): Promise<Map<string, string | null>>;
}
export function createPhotoService(deps: {
  store: PhotoStore | null;
  search: ((query: string) => Promise<FragellaItem[] | null>) | null;
  budget: number;
  now?: () => Date;
}): PhotoService;
```

  - `index.ts` (`import "server-only"`): `getPhotoService(): PhotoService`, singleton montado a partir do ambiente. `store` é `null` se faltar `SUPABASE_URL`/chave. `search` é `null` se `!isFragellaConfigured()`. `budget = Number(FRAGELLA_MONTHLY_BUDGET ?? 18)`.

Algoritmo de `getPhoto` (siga a ordem):
1. `store` null → `null`.
2. `getCached(id)`: se existir, retorna `imageUrl` (`null` para `none`).
3. `key = toKey(house, name, concentration)`. Faz `findMatch(key, await findSeenByBrand(key.brand))`. Se casar, chama `saveCached(found)` e retorna.
4. Se `!allowFetch` ou `search` null → `null` (não grava nada).
5. `month = now().toISOString().slice(0,7)`. Se `getUsage(month) >= budget` → `null` (não grava `none`).
6. `items = await search(\`${house} ${name}\`)`. Se `null` (falha) → `null`, sem incrementar e sem gravar.
7. `incrementUsage(month)`. `addSeen` de todos os itens com `pickImage` não nulo (convertidos com `toKey(item.brand, item.name, item.oilType)`).
8. Faz `findMatch` contra os candidatos novos. Se casar, grava `found` e retorna a URL. Se não, grava `none` e retorna `null`.

`getPhotosCacheOnly`: `getCachedMany`, e para os ausentes, os passos 3/4 (seen, sem buscar). Nunca chama `search`.

- [ ] **Step 1: Testes que falham** (memory store + `search` falso com `vi.fn`; `now` fixo em `2026-11-21`):
  - cache `found` → devolve a URL, `search` não é chamado.
  - cache `none` → `null`, `search` não é chamado.
  - casamento em `fragella_seen` → devolve a URL, grava `found` e não busca.
  - `allowFetch: false` sem cache → `null`, `search` não é chamado e nada é gravado.
  - uso = 18, orçamento 18 → `null`, `search` não é chamado e `getCached` continua `null`.
  - busca devolve 3 itens, um casa → URL correta, uso 1, `findSeenByBrand` tem os itens e o cache fica `found`.
  - busca devolve itens que não casam → `null`, cache `none` e uso 1.
  - `search` devolve `null` (Fragella com 429/5xx) → `null`, uso 0 e cache ausente.
  - `store: null` → `null`, sem erro.
  - `getPhotosCacheOnly` com 3 ids (1 em cache, 1 casando no seen, 1 desconhecido) → mapa com URL, URL e `null`, e `search` nunca é chamado.
- [ ] **Step 2:** `npm test -- service`. Esperado: FAIL.
- [ ] **Step 3:** Implemente `service.ts` e `index.ts`.
- [ ] **Step 4:** `npm test -- service`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: serviço de fotos com cache e orçamento mensal`.

---

### Task 7: Dicionário de tradução

**Files:**
- Create: `scripts/collect-terms.ts`, `data/terms-en.json` (gerado), `src/lib/i18n/pt-terms.json`, `src/lib/i18n/terms.ts`
- Test: `src/lib/i18n/terms.test.ts`

**Interfaces:**
- Produces:
  - `type TermKind = 'family' | 'accord' | 'note' | 'season' | 'occasion' | 'style' | 'gender'`
  - `t(kind: TermKind, en: string): string`: busca pela chave em minúsculas e sem espaços extras. Se não houver tradução, devolve o original como veio. Preserva a capitalização da primeira letra de acordo com o original (ex.: família "Aromatic fougere" → "Fougère aromático").
  - `pt-terms.json`: `{ "family": { "aromatic fougere": "Fougère aromático", ... }, "accord": {...}, "note": {...}, "season": {...}, "occasion": {...}, "style": {...}, "gender": { "men": "Masculino", "women": "Feminino", "unisex": "Unissex" } }`

- [ ] **Step 1: Script de coleta** `scripts/collect-terms.ts` (script `collect:terms`: `tsx scripts/collect-terms.ts`). Ele percorre `GET {TENML_BASE_URL}/perfumes?limit=20&format=detailed&cursor=…` até `next_cursor` ficar nulo, com pausa de 500 ms entre chamadas (ritmo educado). Coleta conjuntos únicos de `family`, `accords`, notas (`key_notes` + pirâmide) e grava `data/terms-en.json` = `{ family: string[], accord: string[], note: string[] }` ordenado. Estação, ocasião e estilo vêm dos enums da spec da 10ML: `season`: spring, summer, autumn, winter; `occasion`: daytime, office, casual, evening, date night, special occasion; `style`: aquatic, boozy, clean, creamy, dark, floral, fresh, citrusy, fruity, gourmand, green, leathery, musky, powdery, sensual, smoky, spicy, sweet, woody. Rode uma vez (chamada real permitida aqui, porque é um script, não um teste) e faça commit do JSON.
- [ ] **Step 2: Testes que falham:**
  - `t('season', 'autumn') === 'Outono'`; `t('gender', 'unisex') === 'Unissex'`; `t('note', 'Bergamot') === 'Bergamota'`; `t('note', 'termo-inexistente-xyz') === 'termo-inexistente-xyz'`.
  - **Cobertura:** para cada `kind` em `data/terms-en.json` (mais os enums fixos), todo termo tem tradução. Em caso de falha, a mensagem lista os faltantes.
- [ ] **Step 3:** `npm test -- terms`. Esperado: FAIL.
- [ ] **Step 4:** Escreva `pt-terms.json` com as traduções em pt-BR de **todos** os termos coletados (nomenclatura usual de perfumaria brasileira: "fava tonka", "ambroxan" mantido, "oud" mantido, "almíscar" para musk). Implemente `terms.ts`.
- [ ] **Step 5:** `npm test -- terms`. Esperado: PASS.
- [ ] **Step 6: Commit** `feat: dicionário pt-BR de famílias, acordes e notas`.

---

### Task 8: Identidade visual, layout e rodapé

**Files:**
- Create: `src/components/Footer.tsx`, `src/components/BottlePlaceholder.tsx`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`, `tailwind` config, se houver
- Test: `src/components/Footer.test.tsx`, `src/components/BottlePlaceholder.test.tsx`

**Interfaces:**
- Produces:
  - `<Footer />`
  - `familyColor(family: string | undefined): string` (exportado de `BottlePlaceholder.tsx`): mapa fixo por palavra-chave da família (`floral`, `woody`, `amber`, `fresh`/`citrus`, `aromatic`/`fougere`, `gourmand`, `leather`, `aquatic`, `chypre`, `green`) e uma cor padrão.
  - `<BottlePlaceholder family?: string; label: string />`: SVG de frasco com `role="img"` e `aria-label={label}`.

- [ ] **Step 1:** Invoque a skill `frontend-design:frontend-design` e defina a direção estética conforme a spec ("boutique de perfumaria", distinta, tema claro/escuro, mobile-first, fotos webp sem fundo "flutuando"). Registre fontes, paleta e tokens em `globals.css`. Use `next/font`.
- [ ] **Step 2: Testes que falham:**
  - `Footer` renderiza o link com o texto exato `Data: 10ML Fragrance Index` e `href="https://10ml.com/perfume-api"`.
  - `familyColor('Aromatic fougere') !== familyColor(undefined)` e `familyColor('Floral') !== familyColor('Woody')`.
  - `BottlePlaceholder` tem `role="img"` com o `aria-label` informado.
- [ ] **Step 3:** `npm test -- Footer BottlePlaceholder`. Esperado: FAIL.
- [ ] **Step 4:** Implemente os componentes. No `layout.tsx`, use `lang="pt-BR"`, metadata (título "Catálogo de Perfumes"), fontes, tema e `<Footer />` em todas as páginas.
- [ ] **Step 5:** `npm test`. Esperado: PASS. Rode `npm run build`. Esperado: ok.
- [ ] **Step 6: Commit** `feat: identidade visual, layout e rodapé com crédito`.

---

### Task 9: Componentes da ficha e dos cards

**Files:**
- Create: `src/components/PerfumeImage.tsx` (client), `src/components/PerfumeCard.tsx`, `src/components/Pyramid.tsx`, `src/components/Accords.tsx`, `src/lib/photos/cards.ts`
- Modify: `next.config.ts` (`images.remotePatterns` para `https://cdn.fragella.com/**`)
- Test: `src/components/components.test.tsx`

**Interfaces:**
- Consumes: `t` (T7), `BottlePlaceholder` (T8), `PerfumeSummary`, `SimilarItem` (T2), `getPhotoService` (T6).
- Produces:
  - `interface CardData { id: string; name: string; house: string; family?: string; imageUrl: string | null }`
  - `toCards(items: (PerfumeSummary | SimilarItem)[]): Promise<CardData[]>` em `cards.ts` (`import "server-only"`): usa `getPhotoService().getPhotosCacheOnly`.
  - `<PerfumeImage src: string | null; alt: string; family?: string; size: 'card' | 'hero' />`: com `src` nulo, ou se a imagem disparar `onError`, mostra `BottlePlaceholder`.
  - `<PerfumeCard card: CardData />`: link para `/perfume/{id}`, família traduzida.
  - `<Pyramid pyramid?: {top; heart; base} />`: rótulos "Topo", "Coração", "Fundo", com notas traduzidas. Retorna `null` se a pirâmide for ausente ou se os três níveis estiverem vazios. Níveis vazios não aparecem.
  - `<Accords accords: string[] />`: barras ou chips na ordem recebida, traduzidas. Retorna `null` com lista vazia.

- [ ] **Step 1: Testes que falham:**
  - `PerfumeImage` com `src={null}` → placeholder (`role="img"`). Com `src` válido, depois de `fireEvent.error(img)` → placeholder aparece.
  - `PerfumeCard` → link `href="/perfume/dior-sauvage-edp"`, nome, marca e família traduzida.
  - `Pyramid` com `{ top: ['bergamot'], heart: [], base: ['vanilla'] }` mostra "Topo" e "Fundo", não mostra "Coração" e exibe "Bergamota".
  - `Pyramid` sem prop → container vazio. O texto renderizado nunca contém "undefined".
  - `Accords` com `[]` → não renderiza nada.
- [ ] **Step 2:** `npm test -- components`. Esperado: FAIL.
- [ ] **Step 3:** Implemente, seguindo a identidade da Tarefa 8.
- [ ] **Step 4:** `npm test -- components`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: componentes de card, imagem, pirâmide e acordes`.

---

### Task 10: Início: busca com sugestões e vitrine

**Files:**
- Create: `src/app/api/sugestoes/route.ts`, `src/components/SearchBox.tsx` (client)
- Modify: `src/app/page.tsx`
- Test: `src/app/api/sugestoes/route.test.ts`, `src/components/SearchBox.test.tsx`

**Interfaces:**
- Consumes: `searchPerfumes` (T2), `toCards` (T9), `PerfumeCard` (T9).
- Produces:
  - `GET /api/sugestoes?q=` → `{ items: { id: string; name: string; house: string }[] }`, no máximo 8. Com `q.trim().length < 2` → `{ items: [] }` sem chamar a 10ML. Em `TenmlError` → status 502 `{ items: [] }`.
  - `<SearchBox initialQuery?: string />`: debounce de 300 ms, lista de sugestões (cada uma é um link para `/perfume/{id}`). Enter ou botão leva para `/busca?q=…`. Descarta respostas antigas: só mostra a resposta da última query digitada (use `AbortController`).

- [ ] **Step 1: Testes que falham:**
  - rota: `q=a` → `items: []` e `searchPerfumes` não é chamado (mock do módulo). `q=sauvage` com 10 resultados → 8 itens. `searchPerfumes` lançando `TenmlError` → status 502.
  - SearchBox (com timers falsos e `fetch` mockado): digitar "sau" e avançar 300 ms → uma chamada para `/api/sugestoes?q=sau`, e as sugestões aparecem. Digitar "sauv" logo em seguida (antes de a primeira resposta chegar) → só as sugestões de "sauv" aparecem. Enviar o formulário → `router.push('/busca?q=sauv')`.
- [ ] **Step 2:** `npm test -- sugestoes SearchBox`. Esperado: FAIL.
- [ ] **Step 3:** Implemente a rota, o SearchBox e a página inicial: título, SearchBox em destaque e a vitrine com **12** perfumes de `searchPerfumes({ iconic: true, limit: 12 })` via `toCards` (só cache). Se a 10ML falhar na vitrine, a página mostra só a busca, com uma mensagem discreta.
- [ ] **Step 4:** `npm test`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: página inicial com busca e vitrine`.

---

### Task 11: Página de resultados

**Files:**
- Create: `src/app/busca/page.tsx`, `src/app/busca/loading.tsx`, `src/app/api/busca/route.ts`, `src/components/LoadMore.tsx` (client), `src/app/error.tsx`
- Test: `src/app/api/busca/route.test.ts`, `src/components/LoadMore.test.tsx`

**Interfaces:**
- Consumes: `searchPerfumes` (T2), `toCards`, `PerfumeCard` (T9), `SearchBox` (T10).
- Produces:
  - `GET /api/busca?q=&cursor=` → `{ results: CardData[]; nextCursor: string | null }`. Sem `q` → 400. Em `TenmlError` → 502.
  - `<LoadMore q: string; initialCursor: string | null />`: acrescenta cards. Some quando `nextCursor` é `null`.
  - `error.tsx`: mensagem "Não conseguimos falar com o catálogo agora." e botão "Tentar de novo" (`reset()`).

- [ ] **Step 1: Testes que falham:**
  - rota: sem `q` → 400. Com `q` e `cursor` → repassa o cursor para `searchPerfumes` e devolve `nextCursor`. Com `TenmlError` → 502.
  - LoadMore: clicar → `fetch('/api/busca?q=…&cursor=bzM')` e os novos cards aparecem. Com resposta `nextCursor: null` o botão some. Com resposta 502, aparece a mensagem "Não foi possível carregar mais" e o botão continua.
- [ ] **Step 2:** `npm test -- busca LoadMore`. Esperado: FAIL.
- [ ] **Step 3:** Implemente. A página `/busca?q=` renderiza o SearchBox preenchido, os primeiros 20 cards e o LoadMore. Com 0 resultados: "Nenhum perfume encontrado para “{q}”." e uma sugestão de buscar pela marca. Sem `q`, redireciona para `/`. Em `TenmlError`, lança o erro para o `error.tsx`. `loading.tsx` mostra skeletons dos cards.
- [ ] **Step 4:** `npm test`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: página de resultados com carregar mais`.

---

### Task 12: Página de detalhe

**Files:**
- Create: `src/app/perfume/[id]/page.tsx`, `src/app/perfume/[id]/not-found.tsx`, `src/app/perfume/[id]/loading.tsx`
- Test: `src/app/perfume/[id]/page.test.tsx`

**Interfaces:**
- Consumes: `getPerfume` (T2), `getPhotoService` (T6), `isBot` (T5), `t` (T7), `toCards`, `PerfumeImage`, `Pyramid`, `Accords`, `PerfumeCard` (T9).

- [ ] **Step 1: Testes que falham** (renderize o Server Component com `await Page({ params: Promise.resolve({ id }) })`, mockando os módulos `tenml/client`, `photos/index` e `next/headers`):
  - perfume completo → mostra nome, marca, ano, "Descrição original (10ML)", "Topo", 5 cards em "Parecidos" e a família traduzida.
  - `getPhoto` é chamado com `allowFetch: true` quando o UA é do Chrome, e com `allowFetch: false` quando é `Googlebot`.
  - `getPerfume` → `null` → chama `notFound()`.
  - perfil core (sem pirâmide, estações ou fixação) → seções ausentes e o texto nunca contém "undefined".
- [ ] **Step 2:** `npm test -- perfume`. Esperado: FAIL.
- [ ] **Step 3:** Implemente. Ordem da ficha: foto grande (`PerfumeImage size="hero"`), nome, marca · ano · concentração, gênero traduzido, frase com o rótulo "Descrição original (10ML)", pirâmide, acordes, estações e ocasiões traduzidas (só se houver), fixação/projeção em escala visual 1–5 (só se houver), perfumistas (só se houver) e "Parecidos" (cards de `perfume.similar` via `toCards`). `generateMetadata` usa o título "{name} — {house}". Em `TenmlError`, lança o erro para o `error.tsx`. `not-found.tsx`: "Perfume não encontrado", com link para a busca.
- [ ] **Step 4:** `npm test`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: página de detalhe do perfume`.

---

### Task 13: robots.txt, script de fotos da vitrine e banco real

**Files:**
- Create: `src/app/robots.ts`, `scripts/seed-photos.ts`
- Test: `src/app/robots.test.ts`

**Interfaces:**
- Consumes: `searchPerfumes` (T2), `createPhotoService`, `createSupabaseStore`, `searchFragrances` (T3/T4/T6).

- [ ] **Step 1: Teste que falha:** `robots()` devolve regra para `*` com `disallow` contendo `/perfume/`, `/busca` e `/api/`, e `allow` contendo `/`.
- [ ] **Step 2:** `npm test -- robots`. Esperado: FAIL. Implemente. Rode de novo. Esperado: PASS.
- [ ] **Step 3: Script** `seed:photos` = `tsx --env-file=.env.local scripts/seed-photos.ts`. Ele monta o serviço diretamente com `createPhotoService({ store: createSupabaseStore(...), search: searchFragrances, budget })`. Não use `getPhotoService`, que tem `server-only`. Percorre as páginas de `searchPerfumes({ iconic: true })` e chama `getPhoto(p, { allowFetch: true })` em cada perfume, imprimindo `✔ foto`, `· sem foto` ou `⏸ orçamento esgotado`. Para quando `getUsage(mês) >= budget`. No fim, imprime o resumo (encontradas, sem foto, uso do mês). Se faltar alguma variável, sai com uma mensagem clara em português. O `next: { revalidate }` do `fetch` é ignorado fora do Next, sem problema.
- [ ] **Step 4 (ação do dono, guiada):** crie o projeto no Supabase (plano grátis), rode `supabase/migrations/0001_init.sql` no SQL Editor e copie a URL e a service role key para `.env.local`. Crie a conta na Fragella e copie a chave para `.env.local`.
- [ ] **Step 5: Verificação real:** `npm run dev`, abra um perfume no navegador e confirme a foto ou o placeholder. Confira no Supabase se `fragella_usage` tem count 1 e se `photo_cache` tem a linha. Depois rode `npm run seed:photos` e confirme que a vitrine da home mostra fotos. **Isso gasta a cota real.** Avise o dono antes.
- [ ] **Step 6: Commit** `feat: robots.txt e script de fotos da vitrine`.

---

### Task 14: Teste ponta a ponta

**Files:**
- Create: `playwright.config.ts`, `e2e/mock-server.mjs`, `e2e/fixtures/search-sauvage.json`, `e2e/fixtures/detail-dior-sauvage-edp.json`, `e2e/fixtures/iconic.json`, `e2e/busca.spec.ts`

**Interfaces:**
- Consumes: `TENML_BASE_URL` e `FRAGELLA_BASE_URL` configuráveis (T2/T3).

- [ ] **Step 1:** `mock-server.mjs`: servidor `node:http` na porta 4010 que responde `GET /tenml/perfumes` (com `iconic=true` → `iconic.json`; senão → `search-sauvage.json`), `GET /tenml/perfumes/dior-sauvage-edp` → a fixture de detalhe e qualquer outro id → 404. `playwright.config.ts` sobe dois `webServer`: o mock e `npm run build && npm run start -- -p 3100`, com env `TENML_BASE_URL=http://localhost:4010/tenml`, sem Supabase e sem Fragella.
- [ ] **Step 2: Teste** `busca.spec.ts`: abrir `/` → vitrine visível → digitar "sauvage" → sugestão "Sauvage Eau de Parfum" visível → Enter → `/busca?q=sauvage` com cards → clicar em "Sauvage Eau de Parfum" → título visível, "Topo" visível, placeholder visível (sem foto, porque não há Supabase) e o rodapé contém "Data: 10ML Fragrance Index". Segundo teste: `/perfume/nao-existe` → "Perfume não encontrado".
- [ ] **Step 3:** `npx playwright install chromium` e depois `npm run test:e2e`. Esperado: 2 testes passando.
- [ ] **Step 4: Commit** `test: fluxo ponta a ponta com APIs simuladas`.

---

### Task 15: README e publicação

**Files:**
- Create/Modify: `README.md`

- [ ] **Step 1: README em português:** o que é, link do site (preencher depois do deploy), prints (adicionar depois), stack, como as duas APIs se juntam (com o diagrama da spec), como rodar localmente (`.env.example`, `npm run dev`, `npm test`, `npm run seed:photos`), crédito da 10ML, seção "Como foi construído com Claude Code" (brainstorming → design → plano → tarefas com TDD → revisão) e a nota sobre o OneDrive (`node_modules`/`.next`).
- [ ] **Step 2 (ação do dono, guiada):** crie o repositório no GitHub e faça o push. Na Vercel, importe o repositório e configure as variáveis `FRAGELLA_API_KEY`, `FRAGELLA_MONTHLY_BUDGET`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Faça o deploy.
- [ ] **Step 3: Verificação:** abra o link publicado: a home tem vitrine com fotos, a busca funciona, o detalhe abre e o rodapé mostra o crédito. Em `https://<site>/robots.txt` aparecem as regras.
- [ ] **Step 4: Commit** `docs: README do projeto` (com o link real).
