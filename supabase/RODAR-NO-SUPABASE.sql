-- ============================================================
-- BLACKOUT MOTOS - RODE ESTE ARQUIVO NO SUPABASE
-- ============================================================
--
-- Cole tudo no SQL Editor do Supabase e clique em Run.
-- Pode rodar quantas vezes quiser: nao duplica nada.
--
-- 1. Cria as colunas que faltam no caixa (confirmado e
--    data_confirmacao). Sem elas, nenhuma despesa, compra ou
--    venda consegue entrar no caixa.
-- 2. Libera a exclusao de despesa e de gasto, que hoje falha
--    calada porque nao existe politica de DELETE.
-- ============================================================


-- 1. COLUNAS DO CAIXA -----------------------------------------

alter table public.cash_transactions
  add column if not exists confirmado boolean not null default true;

alter table public.cash_transactions
  add column if not exists data_confirmacao date;

update public.cash_transactions
   set data_confirmacao = data
 where confirmado is true
   and data_confirmacao is null;

create index if not exists cash_transactions_confirmado_idx
  on public.cash_transactions (confirmado);


-- 2. PERMISSAO DE EXCLUSAO ------------------------------------

do $$
declare
  alvo text;
begin
  foreach alvo in array array[
    'store_expenses',
    'cash_transactions',
    'motorcycle_expenses'
  ]
  loop
    if to_regclass('public.' || alvo) is null then
      continue;
    end if;

    if exists (
      select 1 from pg_policies
       where schemaname = 'public'
         and tablename = alvo
         and cmd in ('DELETE', 'ALL')
    ) then
      raise notice 'Tabela % ja permite exclusao.', alvo;
      continue;
    end if;

    execute format(
      'create policy %I on public.%I
         for delete to authenticated
         using (true)',
      alvo || '_delete_autenticado',
      alvo
    );

    raise notice 'Politica de exclusao criada em %.', alvo;
  end loop;
end $$;


-- 3. AVISA O SISTEMA ------------------------------------------

notify pgrst, 'reload schema';


-- 4. CONFERENCIA ----------------------------------------------
--
-- Depois de rodar, isto deve devolver duas linhas:
-- confirmado e data_confirmacao.

select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'cash_transactions'
   and column_name in ('confirmado', 'data_confirmacao');
