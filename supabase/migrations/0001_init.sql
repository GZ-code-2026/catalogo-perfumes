-- Cache de fotos de perfumes (acesso apenas pelo servidor, com a service role key)

create table photo_cache (
  tenml_id text primary key,
  image_url text null,
  matched_name text null,
  status text not null check (status in ('found', 'none')),
  created_at timestamptz not null default now()
);

create table fragella_seen (
  id serial primary key,
  brand_norm text not null,
  name_norm text not null,
  concentration text null,
  image_url text not null,
  raw_name text not null,
  raw_brand text not null,
  created_at timestamptz not null default now()
);

create unique index fragella_seen_unique
  on fragella_seen (brand_norm, name_norm, coalesce(concentration, ''), image_url);

create index fragella_seen_brand_idx on fragella_seen (brand_norm);

create table fragella_usage (
  month text primary key,
  count int not null default 0
);

create function increment_fragella_usage(p_month text) returns int
language sql
as $$
  insert into fragella_usage (month, count) values (p_month, 1)
  on conflict (month) do update set count = fragella_usage.count + 1
  returning count;
$$;

-- RLS ligado e sem políticas: só a service role key acessa.
alter table photo_cache enable row level security;
alter table fragella_seen enable row level security;
alter table fragella_usage enable row level security;

-- A função só pode ser chamada pelo servidor (service role), nunca pela chave pública.
revoke execute on function increment_fragella_usage(text) from public, anon, authenticated;
