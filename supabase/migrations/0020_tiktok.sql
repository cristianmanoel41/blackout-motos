-- ============================================================
-- BLACKOUT MOTOS - Conexao com o TikTok
-- ============================================================
--
-- Guarda a autorizacao da conta da loja para o sistema mandar
-- fotos para os rascunhos do TikTok. E uma conexao so, da
-- loja, entao a tabela tem uma linha unica - igual ao controle
-- do caixa.
--
-- O token e uma chave: quem tem ele posta pela conta da loja.
-- Por isso a leitura e so para quem esta logado, nunca para o
-- publico, e nenhuma tela devolve o valor dele para o
-- navegador - so o servidor usa.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================


-- ------------------------------------------------------------
-- 1. TABELA
-- ------------------------------------------------------------

create table if not exists public.tiktok_conta (
  id             text primary key default 'principal',

  open_id        text,
  nome_usuario   text,

  access_token   text,
  refresh_token  text,

  -- Quando o access_token deixa de valer.
  expira_em      timestamptz,

  conectado_em   timestamptz not null default now(),
  atualizado_em  timestamptz
);


-- ------------------------------------------------------------
-- 2. PERMISSÕES
--
-- Sem politica para anon: token nao se mostra ao publico.
-- ------------------------------------------------------------

alter table public.tiktok_conta
  enable row level security;

drop policy if exists "acesso total tiktok_conta"
  on public.tiktok_conta;

create policy "acesso total tiktok_conta"
  on public.tiktok_conta
  for all to authenticated
  using (true) with check (true);


-- ------------------------------------------------------------
-- 3. HISTORICO DE POSTAGENS
--
-- Para saber o que ja foi mandado e nao repetir a mesma moto
-- sem querer.
-- ------------------------------------------------------------

create table if not exists public.tiktok_posts (
  id             uuid primary key default gen_random_uuid(),

  motorcycle_id  uuid
                 references public.motorcycles(id) on delete set null,

  -- Identificador que o TikTok devolve ao aceitar o envio.
  publish_id     text,

  -- rascunho | publicado | erro
  situacao       text not null default 'rascunho',

  quantidade_fotos integer not null default 0,
  legenda        text,
  erro           text,

  criado_em      timestamptz not null default now()
);

create index if not exists tiktok_posts_moto
  on public.tiktok_posts (motorcycle_id, criado_em desc);

alter table public.tiktok_posts
  enable row level security;

drop policy if exists "acesso total tiktok_posts"
  on public.tiktok_posts;

create policy "acesso total tiktok_posts"
  on public.tiktok_posts
  for all to authenticated
  using (true) with check (true);


notify pgrst, 'reload schema';


-- ------------------------------------------------------------
-- 4. CONFERÊNCIA
-- ------------------------------------------------------------

select
  (select count(*) from information_schema.tables
    where table_schema = 'public'
      and table_name = 'tiktok_conta')  as conta,
  (select count(*) from information_schema.tables
    where table_schema = 'public'
      and table_name = 'tiktok_posts')  as historico;
