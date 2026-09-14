-- ============================================================
-- BLACKOUT MOTOS - Conexao com a OLX
-- ============================================================
--
-- Guarda a autorizacao da conta da loja na OLX e o que ja foi
-- publicado por la. E uma conexao so, entao a tabela da conta
-- tem uma linha unica - igual ao controle do caixa.
--
-- O token e uma chave: quem tem ele anuncia pela conta da
-- loja. Por isso a leitura e so para quem esta logado, nunca
-- para o publico, e nenhuma tela devolve o valor dele ao
-- navegador - so o servidor usa.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

create extension if not exists pgcrypto;


-- ------------------------------------------------------------
-- 1. A CONEXAO
-- ------------------------------------------------------------

create table if not exists public.olx_conta (
  id             text primary key default 'principal',

  access_token   text,
  refresh_token  text,
  expira_em      timestamptz,

  -- Quem autorizou, para a tela dizer qual conta esta ligada.
  nome_usuario   text,
  user_id        text,

  conectado_em   timestamptz not null default now(),
  atualizado_em  timestamptz
);

alter table public.olx_conta enable row level security;

drop policy if exists "acesso total olx_conta"
  on public.olx_conta;

create policy "acesso total olx_conta"
  on public.olx_conta
  for all to authenticated
  using (true) with check (true);


-- ------------------------------------------------------------
-- 2. O QUE FOI PUBLICADO
--
-- A OLX responde a importacao com um token de processo, e o
-- status sai depois. Guardar os dois deixa a loja ver o que
-- entrou, o que foi recusado e por que.
-- ------------------------------------------------------------

create table if not exists public.olx_anuncios (
  id             uuid primary key default gen_random_uuid(),

  motorcycle_id  uuid
                 references public.motorcycles(id) on delete cascade,

  -- Token do processo de importacao; vale 7 dias na OLX.
  token_processo text,

  -- O numero do anuncio publicado, quando sai.
  list_id        text,

  -- enviado | publicado | recusado | removido | erro
  situacao       text not null default 'enviado',

  mensagem       text,

  enviado_em     timestamptz not null default now(),
  atualizado_em  timestamptz
);

create index if not exists olx_anuncios_moto
  on public.olx_anuncios (motorcycle_id, enviado_em desc);

alter table public.olx_anuncios enable row level security;

drop policy if exists "acesso total olx_anuncios"
  on public.olx_anuncios;

create policy "acesso total olx_anuncios"
  on public.olx_anuncios
  for all to authenticated
  using (true) with check (true);


-- ------------------------------------------------------------
-- 3. TRADUCAO PARA OS CODIGOS DA OLX
--
-- A OLX nao aceita "Honda" nem "CB 300F": quer codigo dela.
-- Aqui fica a ponte entre o que a loja digita e o que a OLX
-- espera, preenchida a partir das tabelas deles.
-- ------------------------------------------------------------

create table if not exists public.olx_codigos (
  id          uuid primary key default gen_random_uuid(),

  -- marca | modelo | cor | cilindrada | tipo
  tipo        text not null,

  -- Como aparece no nosso cadastro, ja em minusculas.
  nosso_nome  text not null,

  -- Codigo que a OLX espera.
  codigo      text not null,

  -- Para modelo: a marca a que ele pertence.
  codigo_pai  text,

  criado_em   timestamptz not null default now()
);

create unique index if not exists olx_codigos_unico
  on public.olx_codigos (tipo, nosso_nome, coalesce(codigo_pai, ''));

alter table public.olx_codigos enable row level security;

drop policy if exists "acesso total olx_codigos"
  on public.olx_codigos;

create policy "acesso total olx_codigos"
  on public.olx_codigos
  for all to authenticated
  using (true) with check (true);


notify pgrst, 'reload schema';


-- ------------------------------------------------------------
-- 4. CONFERENCIA
-- ------------------------------------------------------------

select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'olx_conta')    as conta,
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'olx_anuncios') as anuncios,
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'olx_codigos')  as codigos;
