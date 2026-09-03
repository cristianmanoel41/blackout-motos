-- ============================================================
-- BLACKOUT MOTOS - Quem intermediou a compra da moto
-- ============================================================
--
-- Nem sempre quem entrega a moto e o dono dela. Acontece de o
-- documento estar no nome de um e a negociacao ser feita por
-- outro - um parente, um amigo, alguem que revende.
--
-- O cadastro ja guarda o dono, em fornecedor_*. Estas colunas
-- guardam quem intermediou, para a loja saber com quem tratou
-- se precisar voltar atras.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- ============================================================

alter table public.motorcycles
  add column if not exists intermediador_nome text;

alter table public.motorcycles
  add column if not exists intermediador_cpf text;

alter table public.motorcycles
  add column if not exists intermediador_rg text;

alter table public.motorcycles
  add column if not exists intermediador_telefone text;

alter table public.motorcycles
  add column if not exists intermediador_observacoes text;

notify pgrst, 'reload schema';

-- Conferencia: deve devolver cinco linhas.
select column_name
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'motorcycles'
   and column_name like 'intermediador%'
 order by column_name;
