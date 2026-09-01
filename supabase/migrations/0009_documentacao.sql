-- ============================================================
-- BLACKOUT MOTOS - Controle da documentação da venda
-- ============================================================
--
-- O cliente entrega um valor para a loja cuidar da
-- documentação. Esse dinheiro entra no caixa, mas nao e lucro:
-- ele existe para pagar vistoria, taxas e despachante.
--
-- O lucro da loja e o que SOBRA depois de pagar tudo isso - e
-- so quando a documentacao e dada por concluida, porque ate la
-- ainda pode aparecer custo.
--
-- Os custos ficam nesta tabela propria, ligada a venda, e nao
-- em store_expenses: se fossem despesa da loja, seriam
-- descontados duas vezes do resultado.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- ============================================================


-- ------------------------------------------------------------
-- 1. CUSTOS DA DOCUMENTAÇÃO
-- ------------------------------------------------------------

create table if not exists public.sale_documentation_costs (
  id         uuid primary key default gen_random_uuid(),

  sale_id    uuid not null
             references public.sales(id) on delete cascade,

  -- vistoria | taxas | despachante | outros
  tipo       text not null,

  descricao  text,
  valor      numeric(12,2) not null default 0,
  data       date not null default current_date,

  criado_em  timestamptz not null default now()
);

create index if not exists sale_documentation_costs_sale_idx
  on public.sale_documentation_costs (sale_id);

alter table public.sale_documentation_costs
  enable row level security;

drop policy if exists "custos de documentacao para logados"
  on public.sale_documentation_costs;

create policy "custos de documentacao para logados"
  on public.sale_documentation_costs
  for all to authenticated
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- 2. A VENDA SABE SE A DOCUMENTAÇÃO FECHOU
--
-- Enquanto nao estiver concluida, a sobra nao entra no lucro.
-- ------------------------------------------------------------

alter table public.sales
  add column if not exists documentacao_concluida boolean not null default false;

alter table public.sales
  add column if not exists documentacao_concluida_em date;


-- ------------------------------------------------------------
-- 3. CAIXA: NOVA ORIGEM
--
-- Cada custo da documentacao gera uma saida no caixa. Se a
-- coluna origem tiver CHECK, ele e recriado com os valores que
-- ja existem hoje mais 'documentacao'. Nenhum registro muda.
-- ------------------------------------------------------------

do $$
declare
  nome_constraint text;
  lista           text;
begin
  select conname
    into nome_constraint
    from pg_constraint
   where conrelid = 'public.cash_transactions'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%origem%'
   limit 1;

  if nome_constraint is null then
    raise notice
      'cash_transactions.origem nao possui CHECK. Nada a fazer.';
    return;
  end if;

  select string_agg(quote_literal(valor), ', ' order by valor)
    into lista
    from (
      select distinct origem as valor
        from public.cash_transactions
       where origem is not null
      union
      select unnest(array[
        'venda',
        'compra_moto',
        'gasto_moto',
        'despesa_loja',
        'venda_capacete',
        'compra_capacete',
        'documentacao',
        'outro'
      ])
    ) as valores;

  execute format(
    'alter table public.cash_transactions drop constraint %I',
    nome_constraint
  );

  execute format(
    'alter table public.cash_transactions
       add constraint %I check (origem in (%s))',
    nome_constraint,
    lista
  );

  raise notice 'Constraint % recriada.', nome_constraint;
end $$;


-- ------------------------------------------------------------
-- 4. AUTORIA
--
-- A tabela nova entra no mesmo controle de quem cadastrou e
-- quem alterou que o resto do sistema usa.
-- ------------------------------------------------------------

alter table public.sale_documentation_costs
  add column if not exists created_by uuid;

alter table public.sale_documentation_costs
  add column if not exists updated_by uuid;

alter table public.sale_documentation_costs
  add column if not exists atualizado_em timestamptz;

create or replace trigger trg_autoria
  before insert or update on public.sale_documentation_costs
  for each row execute function public.registrar_autoria();


-- ------------------------------------------------------------
-- 5. CACHE DO POSTGREST
-- ------------------------------------------------------------

notify pgrst, 'reload schema';


-- ------------------------------------------------------------
-- 6. CONFERÊNCIA
--
-- Deve devolver duas linhas: documentacao_concluida e
-- documentacao_concluida_em.
-- ------------------------------------------------------------

select column_name
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'sales'
   and column_name like 'documentacao_concluida%';
