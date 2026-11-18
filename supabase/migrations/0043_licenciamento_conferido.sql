-- ============================================================
-- BLACKOUT MOTOS - Conferência do licenciamento no painel
-- ============================================================
--
-- O painel avisa, pelo final da placa e pelo calendário do
-- Detran-SP, quais motos do pátio precisam ter o licenciamento
-- conferido. Quando a loja confere (no Detran ou no CRLV-e) e
-- aperta "Conferido", o ano fica guardado na própria moto e o
-- aviso some até o vencimento do ano seguinte.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

alter table public.motorcycles
  add column if not exists licenciamento_conferido_ano integer;

alter table public.motorcycles
  add column if not exists licenciamento_conferido_em timestamptz;

alter table public.motorcycles
  add column if not exists licenciamento_conferido_por uuid;

notify pgrst, 'reload schema';

-- Conferência: as colunas novas.
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'motorcycles'
   and column_name like 'licenciamento_%'
 order by column_name;
