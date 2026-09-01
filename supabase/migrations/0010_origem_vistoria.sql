-- ============================================================
-- BLACKOUT MOTOS - Vistoria e despachante são empresas diferentes
-- ============================================================
--
-- A vistoria e feita por uma empresa; o despachante e outra.
-- Cada uma manda a sua conta e e paga em dia diferente.
--
-- Ate aqui os dois custos caiam na mesma origem, e pior: a
-- cautelar entrava como gasto de moto e a vistoria de
-- transferencia como documentacao - as duas da mesma empresa,
-- em lugares diferentes. Na hora de conferir a conta da
-- vistoria nao dava para juntar.
--
-- Com a origem 'vistoria', as duas ficam no mesmo lugar e o
-- despachante fica no seu.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- ============================================================

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
        'vistoria',
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

notify pgrst, 'reload schema';

-- Conferência: as origens em uso hoje.
select origem, count(*) as lancamentos
  from public.cash_transactions
 group by origem
 order by origem;
