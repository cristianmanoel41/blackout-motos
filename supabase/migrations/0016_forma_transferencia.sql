-- ============================================================
-- BLACKOUT MOTOS - Como o cliente pagou a documentacao
-- ============================================================
--
-- A moto vai no cartao e os 690 da transferencia no Pix - ou o
-- contrario. Ate agora o sistema guardava so o valor, entao
-- nem o caixa nem o contrato sabiam por onde esse dinheiro
-- entrou.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

alter table public.sales
  add column if not exists forma_transferencia text;


notify pgrst, 'reload schema';


-- ------------------------------------------------------------
-- CONFERENCIA
--
-- Deve retornar uma linha com o nome da coluna.
-- ------------------------------------------------------------

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'sales'
  and column_name = 'forma_transferencia';
