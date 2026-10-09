-- ============================================================
-- BLACKOUT MOTOS - Moto nossa vendida pela loja parceira
-- ============================================================
--
-- Acontece de o Edvaldo vender uma moto nossa na loja dele. O
-- dinheiro vem dele, no repasse combinado, e os dados de quem
-- comprou chegam depois - as vezes dias depois.
--
-- A venda e registrada na hora, sem cliente (customer_id ja
-- aceita vazio), e esta coluna guarda qual loja vendeu. Ela
-- continua preenchida depois que o comprador entra, para a
-- venda nunca perder de onde veio.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

alter table public.sales
  add column if not exists loja_parceira text;

notify pgrst, 'reload schema';

-- Conferencia: deve devolver uma linha.
select column_name
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'sales'
   and column_name = 'loja_parceira';
