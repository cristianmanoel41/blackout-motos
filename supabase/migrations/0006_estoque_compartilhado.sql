-- ============================================================
-- BLACKOUT MOTOS - COMPARTILHAR O ESTOQUE COM OUTRA LOJA
-- ============================================================
-- Rode este arquivo inteiro no SQL Editor do Supabase.
--
-- Como funciona:
--   1. A loja gera um link com um código (token).
--   2. Quem abre o link vê SOMENTE as motos disponíveis, e
--      somente as colunas de vitrine - nunca valor de compra,
--      gastos, fornecedor ou qualquer dado de cliente.
--   3. Desativar o link corta o acesso na hora.
--
-- A leitura é feita por uma função, não por acesso direto à
-- tabela: sem um token válido não sai nada.
--
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. LINKS GERADOS
-- ------------------------------------------------------------

create table if not exists public.stock_shares (
  id         uuid primary key default gen_random_uuid(),
  token      text not null unique
             default replace(gen_random_uuid()::text, '-', ''),
  loja       text,
  observacao text,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists stock_shares_token
  on public.stock_shares (token)
  where ativo;

alter table public.stock_shares enable row level security;

drop policy if exists "acesso total stock_shares"
  on public.stock_shares;

/* Só quem está logado cria, vê e desativa os links. */
create policy "acesso total stock_shares"
  on public.stock_shares
  for all to authenticated
  using (true) with check (true);

-- ------------------------------------------------------------
-- 2. A VITRINE
--
--    security definer: a função enxerga a tabela de motos por
--    conta própria, então não é preciso liberar motorcycles
--    para visitante nenhum. Sem token válido, devolve vazio.
-- ------------------------------------------------------------

create or replace function public.estoque_compartilhado(
  p_token text
)
returns table (
  id             uuid,
  codigo         text,
  marca          text,
  modelo         text,
  versao         text,
  cor            text,
  ano_fabricacao integer,
  ano_modelo     integer,
  quilometragem  integer,
  preco_anunciado numeric,
  data_entrada   date
)
language sql
security definer
stable
set search_path = public
as $$
  select
    m.id,
    m.codigo,
    m.marca,
    m.modelo,
    m.versao,
    m.cor,
    m.ano_fabricacao,
    m.ano_modelo,
    m.quilometragem,
    m.preco_anunciado,
    m.data_entrada
  from public.motorcycles m
  where m.status = 'disponivel'
    and exists (
      select 1
        from public.stock_shares s
       where s.token = p_token
         and s.ativo
    )
  order by m.marca, m.modelo;
$$;

grant execute
  on function public.estoque_compartilhado(text)
  to anon, authenticated;

-- ------------------------------------------------------------
-- 3. DADOS DA VITRINE (nome da loja que compartilhou)
-- ------------------------------------------------------------

create or replace function public.vitrine_info(
  p_token text
)
returns table (
  loja  text,
  ativo boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select s.loja, s.ativo
    from public.stock_shares s
   where s.token = p_token
     and s.ativo;
$$;

grant execute
  on function public.vitrine_info(text)
  to anon, authenticated;

-- ------------------------------------------------------------
-- FIM
-- ------------------------------------------------------------
