-- ============================================================
-- BLACKOUT MOTOS - Limpar restos de moto apagada
-- ============================================================
--
-- Quando uma moto e apagada, pode sobrar coisa apontando para
-- ela: a venda, os lancamentos do caixa, a composicao do
-- pagamento, os gastos. Esses restos continuam contando no
-- painel - e por isso o mes mostra seis vendas onde foram
-- cinco.
--
-- Este arquivo tem duas partes:
--   1. MOSTRA o que esta orfao (nao apaga nada)
--   2. APAGA esses orfaos
--
-- Rode a parte 1 primeiro e confira os resultados. So depois
-- rode a parte 2.
-- ============================================================


-- ============================================================
-- PARTE 1 - DIAGNOSTICO (nao altera nada)
-- ============================================================

-- Vendas cuja moto nao existe mais
select
  'venda orfa' as tipo,
  s.id,
  s.data_venda::text as data,
  s.cliente,
  s.valor_total_venda as valor
from public.sales s
where s.motorcycle_id is not null
  and not exists (
    select 1 from public.motorcycles m
     where m.id = s.motorcycle_id
  )

union all

-- Lancamentos de caixa de venda que nao existe mais
select
  'caixa sem venda',
  ct.id,
  ct.data::text,
  ct.descricao,
  ct.valor
from public.cash_transactions ct
where ct.origem = 'venda'
  and ct.origem_id is not null
  and not exists (
    select 1 from public.sales s
     where s.id::text = ct.origem_id::text
  )

union all

-- Lancamentos de compra de moto que nao existe mais
select
  'caixa sem moto',
  ct.id,
  ct.data::text,
  ct.descricao,
  ct.valor
from public.cash_transactions ct
where ct.origem = 'compra_moto'
  and ct.origem_id is not null
  and not exists (
    select 1 from public.motorcycles m
     where m.id::text = ct.origem_id::text
  )

union all

-- Gastos de moto que nao existe mais
select
  'gasto sem moto',
  me.id,
  me.data::text,
  me.descricao,
  me.valor
from public.motorcycle_expenses me
where me.motorcycle_id is not null
  and not exists (
    select 1 from public.motorcycles m
     where m.id = me.motorcycle_id
  )

order by tipo, data;


-- ============================================================
-- PARTE 2 - LIMPEZA
--
-- Rode SO depois de conferir a parte 1.
-- Selecione daqui para baixo antes de clicar em Run.
-- ============================================================

-- 2.1 Caixa dos gastos de motos que nao existem mais
delete from public.cash_transactions ct
where ct.origem in ('gasto_moto', 'outro')
  and ct.origem_id is not null
  and exists (
    select 1
      from public.motorcycle_expenses me
     where me.id::text = ct.origem_id::text
       and me.motorcycle_id is not null
       and not exists (
         select 1 from public.motorcycles m
          where m.id = me.motorcycle_id
       )
  );

-- 2.2 Gastos de motos que nao existem mais
delete from public.motorcycle_expenses me
where me.motorcycle_id is not null
  and not exists (
    select 1 from public.motorcycles m
     where m.id = me.motorcycle_id
  );

-- 2.3 Caixa das vendas orfas
delete from public.cash_transactions ct
where ct.origem = 'venda'
  and ct.origem_id is not null
  and exists (
    select 1
      from public.sales s
     where s.id::text = ct.origem_id::text
       and s.motorcycle_id is not null
       and not exists (
         select 1 from public.motorcycles m
          where m.id = s.motorcycle_id
       )
  );

-- 2.4 Composicao de pagamento das vendas orfas
delete from public.sale_payment_components spc
where exists (
  select 1
    from public.sales s
   where s.id = spc.sale_id
     and s.motorcycle_id is not null
     and not exists (
       select 1 from public.motorcycles m
        where m.id = s.motorcycle_id
     )
);

-- 2.5 As vendas orfas
delete from public.sales s
where s.motorcycle_id is not null
  and not exists (
    select 1 from public.motorcycles m
     where m.id = s.motorcycle_id
  );

-- 2.6 Caixa de compra de moto que nao existe mais
delete from public.cash_transactions ct
where ct.origem = 'compra_moto'
  and ct.origem_id is not null
  and not exists (
    select 1 from public.motorcycles m
     where m.id::text = ct.origem_id::text
  );


-- ============================================================
-- PARTE 3 - CONFERENCIA
--
-- Quantas vendas ativas existem no mes atual. Tem que bater
-- com o numero do painel.
-- ============================================================

select count(*) as vendas_ativas_no_mes
  from public.sales
 where status = 'ativa'
   and data_venda >= date_trunc('month', current_date)
   and data_venda <  date_trunc('month', current_date) + interval '1 month';
