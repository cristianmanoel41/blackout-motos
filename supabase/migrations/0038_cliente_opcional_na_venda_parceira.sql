-- ============================================================
-- BLACKOUT MOTOS - Venda pela loja parceira sem cliente
-- ============================================================
--
-- A 0037 deixou registrar a venda que o Edvaldo fez sem os
-- dados do comprador, mas a regra antiga do banco
-- (sales_cliente_obrigatorio) continuou exigindo cliente em
-- toda venda, e o registro parava em:
--
--   new row for relation "sales" violates check constraint
--   "sales_cliente_obrigatorio"
--
-- A regra passa a ser: toda venda tem cliente, a nao ser a
-- vendida pela loja parceira, que pode ficar sem ate o
-- comprador ser informado na ficha da venda.
--
-- NOT VALID: vale para as vendas novas e as editadas, sem
-- reconferir as antigas.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

alter table public.sales
  drop constraint if exists sales_cliente_obrigatorio;

alter table public.sales
  add constraint sales_cliente_obrigatorio
  check (customer_id is not null or loja_parceira is not null)
  not valid;

notify pgrst, 'reload schema';

-- Conferencia: deve mostrar a regra nova.
select pg_get_constraintdef(oid) as regra
  from pg_constraint
 where conrelid = 'public.sales'::regclass
   and conname = 'sales_cliente_obrigatorio';
