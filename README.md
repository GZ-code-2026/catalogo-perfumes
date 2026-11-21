# Catálogo de Perfumes

Um site em português onde você digita o nome de um perfume e vê a ficha dele: marca, família olfativa, pirâmide de notas (topo, coração e fundo), acordes, frase descritiva, foto e perfumes parecidos. Funciona bem no celular e no desktop, com tema claro e escuro.

Projeto pessoal de portfólio, construído de ponta a ponta com o Claude Code: design, plano, código com testes, revisão e publicação.

🔗 Site: (em breve)

## Prints

<!-- TODO: adicionar prints (home, resultados, detalhe, celular) depois do deploy -->

(em breve)

## Como funciona

O app combina duas APIs com papéis bem separados:

- **10ML Fragrance Index** (grátis, sem chave): fornece **todos os dados** (busca, detalhe, notas, acordes, parecidos).
- **Fragella** (plano grátis, 20 requisições por mês): usada **só para as fotos**.

O navegador nunca fala com nenhuma das duas. Tudo passa pelo servidor do Next.js, o que mantém as chaves secretas e permite cache.

```
Navegador ──> Next.js (Vercel)
                ├─ páginas (Server Components) ──> 10ML API
                └─ serviço de fotos (só servidor) ──> Supabase (cache)
                                                 └─> Fragella (se faltar no cache e houver cota)
```

### Serviço de fotos

1. Procura a foto no cache do Supabase (`photo_cache`). Achou (ou está marcado "sem foto")? Devolve e termina.
2. Se faltar, confere a cota do mês e reserva uma chamada antes de buscar. Sem cota, devolve placeholder, sem marcar "sem foto", para tentar de novo no mês seguinte.
3. Chama a Fragella e guarda **todos** os resultados vistos (`fragella_seen`), assim outros perfumes podem casar com fotos já conhecidas sem gastar cota.
4. Tenta casar o perfume com os resultados. Casou: grava a URL. Não casou: grava "sem foto".

Guardamos só a URL da imagem (hospedada em `cdn.fragella.com`), nunca o arquivo.

### Correspondência conservadora de nomes

Regra de ouro: **nunca mostrar o frasco errado**. É melhor um placeholder ilustrado do que a foto de outro perfume. Por isso o casamento exige:

- marca igual (com apelidos, como `ysl` = `yves saint laurent`);
- nome igual, ou com no máximo uma palavra diferindo por um erro de digitação;
- concentração compatível: "Sauvage" EDT não casa com "Sauvage Eau de Parfum";
- empate entre candidatos significa não casar.

Sem foto, aparece um frasco em SVG colorido pela família olfativa.

### Proteções da cota

- **Orçamento mensal:** `FRAGELLA_MONTHLY_BUDGET` (padrão 18 de 20, deixando folga).
- **Robôs nunca gastam cota:** buscadores e prévias de link (WhatsApp, Slack etc.) só leem o cache. O `robots.txt` também bloqueia `/perfume/` e `/busca`.
- **Listas só leem o cache:** apenas a página de detalhe pode chamar a Fragella (no máximo 1 chamada por visita).
- **Script de preenchimento:** `npm run seed:photos` enche o cache da vitrine antes do lançamento.

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- Supabase (Postgres) como cache de fotos
- Vercel para publicação
- Vitest + Testing Library (testes unitários) e Playwright (testes ponta a ponta)

## Rodando localmente

Pensado para Windows (PowerShell).

### 1. Node.js

Instale o Node LTS. Uma boa opção é o [fnm](https://github.com/Schniz/fnm). Para ele funcionar no PowerShell, rode `notepad $PROFILE` e adicione esta linha ao perfil:

```powershell
fnm env --use-on-cd | Out-String | Invoke-Expression
```

Abra um novo terminal e confira com `node -v`.

### 2. Dependências

```powershell
npm install
```

### 3. Variáveis de ambiente

```powershell
Copy-Item .env.example .env.local
```

Preencha o `.env.local`:

| Variável | Para quê |
|---|---|
| `FRAGELLA_API_KEY` | chave da Fragella (só servidor) |
| `FRAGELLA_MONTHLY_BUDGET` | limite mensal de chamadas (padrão `18`) |
| `SUPABASE_URL` | Project URL do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | chave secreta do Supabase (`service_role` ou Secret key `sb_secret_…`; só servidor) |
| `TENML_BASE_URL` | já vem preenchida |
| `FRAGELLA_BASE_URL` | já vem preenchida |

**O app roda sem nenhuma chave**: nesse caso mostra apenas os placeholders no lugar das fotos. Nunca use o prefixo `NEXT_PUBLIC_` nessas chaves.

### 4. Supabase (cache de fotos)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, cole e rode o conteúdo de `supabase/migrations/0001_init.sql`.
3. Em **Project Settings > API**, copie a **Project URL** e a chave secreta (service_role / Secret key `sb_secret_…`) para o `.env.local`. Qualquer uma das duas funciona com o supabase-js.

### 5. Comandos

Antes do primeiro `npm run test:e2e`, instale o navegador do Playwright:

```powershell
npx playwright install chromium
```

```powershell
npm run dev          # servidor local em http://localhost:3000
npm test             # testes unitários (Vitest)
npm run test:e2e     # testes ponta a ponta (Playwright)
npm run seed:photos  # preenche o cache de fotos da vitrine
npm run build        # build de produção
npm run lint         # checagem de código
```

- `npm run test:e2e` usa um mock local e **nunca chama as APIs reais**. Nenhum teste do projeto chama a Fragella ou a 10ML de verdade.
- `npm run seed:photos` **gasta cota real da Fragella** (respeitando `FRAGELLA_MONTHLY_BUDGET`) e para quando o orçamento acaba. Pode ser rodado de novo em meses seguintes.

### Limpando o cache de fotos

Se as regras de correspondência mudarem, apague o cache no **SQL Editor** do Supabase para as fotos serem procuradas de novo:

```sql
delete from photo_cache;
```

### Nota sobre o OneDrive

Se a pasta do projeto fica dentro do OneDrive, exclua `node_modules` e `.next` da sincronização (ou mova o repositório para fora do OneDrive). Caso contrário, o build pode falhar com erros `EPERM` por arquivos travados. Se acontecer, apague a pasta `.next` e rode de novo.

## Publicando na Vercel

1. Em [vercel.com](https://vercel.com), clique em **Add New > Project** e importe este repositório do GitHub.
2. Em **Environment Variables**, cadastre `FRAGELLA_API_KEY`, `FRAGELLA_MONTHLY_BUDGET`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
3. Clique em **Deploy**.

O plano grátis do Supabase **pausa o projeto depois de um tempo sem uso**. Enquanto ele estiver pausado, o site continua funcionando, mas mostra só os placeholders no lugar das fotos. Para voltar, reative o projeto no painel do Supabase.

## Como foi construído com Claude Code

O processo foi tão importante quanto o resultado:

1. **Brainstorming:** conversa para definir objetivos, anti-objetivos e escolher as ferramentas.
2. **Documento de design:** [`docs/superpowers/specs/2026-11-21-catalogo-perfumes-design.md`](docs/superpowers/specs/2026-11-21-catalogo-perfumes-design.md).
3. **Plano de implementação:** [`docs/superpowers/plans/2026-11-21-catalogo-perfumes.md`](docs/superpowers/plans/2026-11-21-catalogo-perfumes.md).
4. **16 tarefas**, cada uma construída por um subagente com TDD (teste primeiro) e revisada por outro subagente.
5. **Revisão final** do conjunto.

## Créditos

- Dados: [Data: 10ML Fragrance Index](https://10ml.com/perfume-api)
- Fotos: [Fragella](https://api.fragella.com)
