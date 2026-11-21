# Catálogo de Perfumes — Design

Data: 2026-11-21

## Intenção e porquê

Um site onde a pessoa digita o nome de um perfume e vê a ficha dele: marca, família olfativa, notas (topo/coração/fundo), acordes, descrição curta, foto e perfumes parecidos.

É um projeto pessoal, com dois objetivos:

1. **Conhecer o Claude Code** no fluxo completo: design → plano → construção com testes → revisão → publicação. O processo é tão importante quanto o resultado. Cada etapa deve ser explicada ao dono do projeto enquanto acontece.
2. **Portfólio**: um link público que impressiona à primeira vista. O visual pesa muito. Quem avalia olha a cara do app antes do código.

Ninguém de fora depende do app, e não há objetivo comercial.

## Objetivos

- Busca por nome com sugestões enquanto o usuário digita.
- Lista de resultados com foto, nome, marca e família.
- Página de detalhe com foto grande, marca, ano (se houver), frase descritiva, pirâmide olfativa, acordes, estações/ocasiões (se houver) e perfumes parecidos.
- Funcionar bem no celular (mobile-first) e no desktop.
- Publicado com link público.

## Fora do escopo (por enquanto)

Login, favoritos em conta, comparar perfumes, preços/compra, painel administrativo, outros idiomas além do português e tradução das frases descritivas.

## Anti-objetivos (seria fracasso mesmo funcionando)

- **Foto errada num perfume.** É melhor mostrar o placeholder ilustrado do que a foto de outro frasco.
- **Visual genérico de template.** Para o portfólio, isso anula o propósito.
- **Chave da Fragella exposta no navegador.**
- **Gastar a cota da Fragella sem controle**, a ponto de as fotos sumirem logo no começo do mês.
- **Esconder ou omitir o crédito obrigatório da 10ML.**

## Fontes de dados e restrições

### 10ML Fragrance Index (dados principais)
- Base: `https://mcp.10ml.com/api/v1`. Especificação OpenAPI: `https://mcp.10ml.com/openapi.json`. Termos: `https://mcp.10ml.com/terms`.
- Grátis, sem chave, sem limite fixo. Pede "ritmo educado". As respostas trazem cache de 5 minutos.
- Endpoints usados: `GET /perfumes?q=` (busca, `limit` máx. 20, paginação por `cursor`), `GET /perfumes/{id}?format=detailed` (detalhe com pirâmide etc.) e `GET /similar?perfume=` (parecidos, máx. 15).
- Campos: `id`, `name`, `house`, `gender`, `family`, `accords`, `key_notes`, `character` (uma frase editorial), opcionais `concentration`, `year`, `pyramid{top,heart,base}`, `seasons`, `occasions`, `longevity`, `projection`, `perfumers`.
- Cerca de 6.000 perfumes. Fixação, projeção e perfumistas existem só em ~480.
- **Obrigatório:** crédito visível "Data: 10ML Fragrance Index" com link para `https://10ml.com/perfume-api` em toda página que mostra os dados.
- Pode guardar em cache. Uso comercial também é permitido.

### Fragella (só fotos)
- Base: `https://api.fragella.com/api/v1`. Autenticação pelo header `x-api-key`. **A chave é secreta e fica só no servidor.**
- **Plano grátis: 20 requisições por mês.** Só respostas 2xx contam (inclusive busca vazia). `GET /usage` mostra a cota e não consome.
- `GET /fragrances?search=<nome>&limit=10` faz busca fuzzy por nome e marca (mínimo de 3 caracteres) e devolve até 10 perfumes, cada um com `Name`, `Brand`, `Image URL` (jpg) e `Image URL Transparent` (webp sem fundo).
- As imagens ficam hospedadas em `cdn.fragella.com`. Guardamos **só a URL**, não o arquivo.
- Os termos não tratam claramente de exibir imagens nem de guardar cache. Para um portfólio pessoal e não comercial, aceitamos o risco. Guardamos apenas o mapeamento perfume → URL, não os dados completos da Fragella.
- Se ficar apertado, o dono pode assinar o plano Basic (US$12/mês) por um mês para "encher" o cache. Isso é decisão dele, não do código.

## Abordagens consideradas

| | Abordagem | Prós | Contras |
|---|---|---|---|
| **A (escolhida)** | **Next.js (App Router, TypeScript) na Vercel + Supabase (Postgres) como cache de fotos** | Um projeto, uma linguagem. Rotas de servidor escondem a chave. Deploy grátis e automático. Stack muito pedida em vagas, e o Claude Code trabalha bem com ela. | Exige aprender TypeScript/React. |
| B | Servidor FastAPI (Python) + React separado | Aproveita o Python que o dono já conhece | Dois projetos e dois deploys. Mais peças para um primeiro projeto, sem ganho para o objetivo. |
| C | Só front-end, sem servidor | Mais simples | Chave exposta e nenhum lugar para o cache. Descartada. |

O dono deixou a escolha das ferramentas comigo e aprovou a **A**.

## Como funciona

### Arquitetura

```
Navegador ──> Next.js (Vercel)
                ├─ páginas (Server Components) ──> 10ML API
                └─ serviço de fotos (só servidor) ──> Supabase (cache)
                                                 └─> Fragella (se faltar no cache e houver cota)
```

O navegador nunca fala diretamente com a 10ML nem com a Fragella. Tudo passa pelo servidor do Next.js. Isso mantém a chave segura e permite cache.

### Telas

1. **Início / Busca (`/`)**: campo de busca em destaque, com sugestões enquanto digita (debounce de ~300 ms, mínimo de 2 caracteres, via rota interna que chama a 10ML). Sem busca ativa, a tela mostra uma vitrine de perfumes icônicos (filtro `iconic` da 10ML), para não abrir vazia.
2. **Resultados (`/busca?q=`)**: grade de cards com foto, nome, marca e família, até 20 itens, com botão "carregar mais" (cursor da 10ML).
3. **Detalhe (`/perfume/[id]`)** (se a 10ML responder com `exact: false`, ou seja, um palpite aproximado para um id desconhecido, mostramos 404 — decisão minha. Os parecidos podem vir da própria resposta detalhada, quando ela trouxer parecidos suficientes, para evitar uma chamada extra): foto grande, nome, marca, ano, concentração, frase, pirâmide olfativa, acordes (visual em barras/chips, na ordem da 10ML), estações/ocasiões quando houver, fixação/projeção quando houver e a seção "Parecidos" (até 6 cards).
4. **Rodapé fixo em todas as páginas**: "Data: 10ML Fragrance Index" com link.
5. **Estados**: carregando (skeletons), nada encontrado (com sugestão de outra busca), erro da 10ML (mensagem amigável e botão "tentar de novo") e 404 de perfume.

### Serviço de fotos (a peça mais delicada)

Entrada: um perfume da 10ML (`id`, `name`, `house`). Saída: URL da foto ou `null`.

1. Procura `photo_cache` no Supabase pelo `tenml_id`. Se encontrar (com URL ou marcado como "sem foto"), devolve e acaba aí.
2. Se não encontrar, verifica a cota. Se a cota local do mês já atingiu o limite configurado (`FRAGELLA_MONTHLY_BUDGET`, padrão 18, deixando 2 de folga para testes), devolve `null` **sem gravar "sem foto"** (para tentar de novo no mês seguinte).
3. Chama `GET /fragrances?search=<house> <name>&limit=10` e incrementa o contador do mês.
4. **Aproveita a chamada inteira:** para cada um dos até 10 resultados da Fragella, guarda em `fragella_seen` (marca normalizada, nome normalizado, URL da imagem). Assim, buscas futuras de outros perfumes podem casar com fotos já vistas sem gastar cota.
5. Tenta casar o perfume da 10ML (ver "Correspondência") com os resultados. Se casar, grava a URL em `photo_cache`. Se não casar, grava "sem foto" para não gastar cota de novo com ele.
6. Antes do passo 3, também procura em `fragella_seen` um casamento já existente. Se houver, usa e não chama a API.

**Quando buscar fotos:** só para itens que aparecem na tela, priorizando o perfume da página de detalhe e depois os cards visíveis. Para não gastar a cota numa única listagem, as listas (resultados e parecidos) **só usam o cache** (`photo_cache` + `fragella_seen`) e nunca chamam a Fragella. **Só a página de detalhe** pode gastar cota (no máximo 1 chamada por visita). Como cada chamada traz até 10 perfumes, o cache das listas vai enchendo como efeito colateral.

Preferência de imagem: `Image URL Transparent` (webp sem fundo, que combina melhor com o design). Se faltar, usa `Image URL`.

**Proteção contra robôs (decisão minha):** antes de gastar cota, o serviço verifica o user-agent da requisição. Robôs conhecidos (buscadores, prévias de link de WhatsApp/Slack/Discord/X etc.) **nunca** chamam a Fragella e só leem o cache. Além disso, `robots.txt` bloqueia `/perfume/` e `/busca` para buscadores. A home continua indexável.

**Preenchimento inicial da vitrine (decisão minha):** um script de linha de comando (`npm run seed:photos`) que o dono roda manualmente. Ele busca na 10ML os perfumes da vitrine (filtro `iconic`) e, para cada um ainda sem foto no cache, faz a busca na Fragella, respeitando o orçamento do mês e parando quando ele acaba. Usa o mesmo serviço de fotos e as mesmas regras de correspondência. Pode ser rodado de novo em meses seguintes para completar o que faltou. Assim, a vitrine já aparece com fotos no lançamento.

### Correspondência entre 10ML e Fragella

Normalização: minúsculas, sem acentos, sem pontuação e espaços colapsados. **Antes** de normalizar, extrai a concentração do nome (`eau de parfum`/`edp`, `eau de toilette`/`edt`, `parfum`, `extrait`, `cologne`/`edc`) para um campo próprio. `elixir` e `intense` **não** são concentrações: ficam no nome ("Sauvage Elixir" é outro perfume). Depois remove esses termos do nome, e também o nome da marca, se estiver repetido. Usa uma tabela pequena de apelidos de marca (ex.: `ysl` = `yves saint laurent`) — decisão minha.

*(Revisado após o teste com dados reais da Fragella, que trazem nomes como "Christian Dior Dior Sauvage Edp":)*
- Apelidos de marca: lista explícita, sem semelhança automática — `ysl`, `d g`/`dolce and gabbana`, `ck`, `jpg`, `christian dior` → `dior`, `giorgio armani` → `armani`, `paco rabanne` → `rabanne`, `mfk` → `maison francis kurkdjian`.
- A marca é tirada do **começo** do nome repetidamente, em qualquer forma (como veio, forma oficial e apelidos): com marca "Dior", "christian dior dior sauvage" → "sauvage". O nome nunca fica vazio. Erros de digitação ("chirstian") não são tirados — continuam sem casar, o lado seguro.
- Descritores de público são tirados só do **final** do nome. Os neutros ("unisex", "for men and women", "for women and men") somem sem marcar nada. "for men"/"for women" saem do nome mas viram o **público** da chave (`men`/`women`, marcado como explícito). "pour homme", "pour femme", "homme", "femme" e "pour homme et femme" ficam (podem ser parte do nome).
- **Público (revisão 2):** na Fragella, o público vem só do nome. Na 10ML, vem do nome ("for men"/"for women", explícito) ou, se o nome não disser, do campo `gender` (`men`/`women`; `unisex` ou vazio = desconhecido; não explícito). Não casa se os dois públicos forem conhecidos e diferentes, nem se o nome da 10ML disser o público e o candidato não tiver (ex.: "The One for Men" não casa com "The One"). Público vindo só do `gender` não exige que o candidato tenha um. O público não tem coluna em `fragella_seen`: é lido de `raw_name` na hora.
- Na Fragella, a concentração escrita no **nome** vence o `OilType` (que só vale se o nome não tiver). Na 10ML continua: campo `concentration` primeiro, depois o nome.

Regra de casamento (conservadora, de acordo com o anti-objetivo):
- A marca normalizada precisa ser **igual** (depois dos apelidos).
- O nome normalizado precisa ser **igual**, **ou** ter a mesma quantidade de palavras, com todas iguais exceto **no máximo uma**, que pode ter só um erro de digitação (distância de Levenshtein ≤ 1, ambas com 4 ou mais letras). Nomes vazios nunca casam. *(Revisado na implementação: a regra original, Jaro-Winkler ≥ 0,9 no nome inteiro, aceitava "Acqua di Gio" como "Acqua di Gioia".)*
- **Concentração (decisão do dono, para não mostrar frasco de versão irmã):** a concentração da 10ML vem do campo `concentration` ou, se faltar, do nome. A da Fragella vem do **nome** ou, se o nome não tiver, de `OilType`. Se as duas forem conhecidas e **diferentes**, **não casa**. Se só uma for conhecida, ou nenhuma, a concentração não bloqueia o casamento.
- Se mais de um resultado casar, escolhe o de maior similaridade. Se empatar, só casa quando é o mesmo produto: mesma imagem, ou mesma chave (marca, nome, concentração e público) fotografada mais de uma vez — aí fica o primeiro recebido. Empate entre chaves diferentes não casa.
- Ao mudar estas regras, rode `npm run renormalize:seen`: recalcula as chaves de `fragella_seen` (sem chamar a Fragella) e apaga os "sem foto" do cache.

Essa função é pura e é a mais testada do projeto. Casos reais:
- "Sauvage" (EDT) vs "Sauvage Eau de Parfum" → **não** casa.
- "Sauvage" sem concentração vs "Sauvage" → casa.
- "Bleu de Chanel Parfum" vs "Bleu de Chanel" EDP → não casa.
- Marcas com acento.
- Linhas diferentes com nomes parecidos, como "Aventus" vs "Aventus for Her" → não casa.

### Idioma e tradução (decisão do dono)

A 10ML devolve o conteúdo em inglês. Seu parâmetro `locale` só muda links e rótulos do site deles.

- **Interface:** toda em português.
- **Traduzidos com dicionário fixo** (arquivos TypeScript/JSON no repositório, gerados uma vez durante a construção e revisáveis à mão): famílias, acordes, estações, ocasiões, estilos, gênero e as ~285 notas. A lista completa de notas vem dos endpoints da 10ML. Um termo sem tradução no dicionário aparece no original em inglês, nunca vazio, e um teste lista os termos faltantes.
- **Não traduzido:** a frase descritiva (`character`) fica em inglês, com rótulo discreto do tipo "Descrição original (10ML)". Nomes de perfumes, marcas e perfumistas também não são traduzidos.
- A busca continua aceitando o que o usuário digita. Buscar por nota em português está fora do escopo.

### Placeholder sem foto

Frasco ilustrado em SVG, com cor derivada da família olfativa (um mapa fixo família → cor, mais uma cor padrão). Ele precisa parecer intencional, não um ícone quebrado.

### Banco de dados (Supabase / Postgres)

- `photo_cache(tenml_id text pk, image_url text null, matched_name text null, status text check in ('found','none'), created_at timestamptz)`
- `fragella_seen(id serial pk, brand_norm text, name_norm text, image_url text, raw_name text, raw_brand text, created_at)` com índice em `(brand_norm, name_norm)`
- `fragella_usage(month text pk /* 'YYYY-MM' */, count int)`, com incremento atômico (`update ... set count = count + 1 ... returning`)

O acesso é feito só pelo servidor, com a service role key (nunca exposta). RLS fica habilitado sem políticas públicas.

### Cache da 10ML

Usamos o cache do Next.js (`fetch` com `revalidate`): detalhe e parecidos por 1 dia, busca por 5 minutos. Não há banco para os dados da 10ML.

### Visual

Direção estética definida na construção com a skill `frontend-design`: distinta, elegante, "boutique de perfumaria", sem cara de template. As fotos webp sem fundo devem flutuar sobre o fundo. Tem tema claro e escuro. Precisa ficar bonito no celular primeiro.

### Variáveis de ambiente

`FRAGELLA_API_KEY`, `FRAGELLA_MONTHLY_BUDGET` (padrão 18), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Sem a chave da Fragella ou sem o Supabase, o app **continua funcionando** e mostra apenas os placeholders (útil em desenvolvimento e nos testes).

### Testes

- Unitários (Vitest): normalização, correspondência, escolha de imagem e lógica de orçamento do serviço de fotos (com Supabase e Fragella simulados).
- Componentes: cards, pirâmide e estados vazio/erro.
- Um teste ponta a ponta (Playwright) do fluxo buscar → abrir detalhe, com as APIs externas simuladas.
- Os testes nunca chamam a Fragella de verdade, para não gastar a cota.

### Publicação

Repositório no GitHub (conta do dono) → Vercel com deploy automático da branch `main`. Projeto Supabase no plano grátis. Variáveis configuradas no painel da Vercel. O README explica o projeto para quem chega pelo portfólio: prints, link, stack e como foi construído com Claude Code.

## Restrições de ambiente

- Windows 11. O Git existe no Git Bash. O Node.js precisa estar instalado (versão LTS), e a verificação é o primeiro passo do plano.
- A pasta fica dentro do OneDrive (`Documentos\GitHub\projetos claude\catalogo-perfumes`). Excluir `node_modules` e `.next` da sincronização, ou aceitar a lentidão. Isso fica registrado no README.
- O dono é iniciante em TypeScript/React. O código deve ser simples e legível, sem abstrações desnecessárias.

## Decisões deixadas para quem construir

- Fontes, paleta e layout exatos (dentro da direção estética acima).
- Biblioteca de estilo (Tailwind CSS é a sugestão).
- Biblioteca de similaridade de strings, ou uma implementação própria simples.
- Quantos perfumes mostrar na vitrine inicial.
