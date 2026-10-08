-- ============================================================
-- BLACKOUT MOTOS - Placa na vitrine, link por link
-- ============================================================
--
-- Loja parceira que faz financiamento precisa da placa para
-- simular. Mas nem todo link deve mostrar a placa - por isso
-- ela é uma escolha de cada link (coluna mostrar_placa), e
-- começa desligada em todos.
--
-- A função da vitrine só devolve a placa quando o link do
-- token tem a opção ligada. Nos demais, a coluna vem vazia.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

alter table public.stock_shares
  add column if not exists mostrar_placa boolean not null default false;

-- A função ganha uma coluna nova no retorno; o Postgres não
-- deixa trocar o formato com "create or replace".
drop function if exists public.estoque_compartilhado(text);

create function public.estoque_compartilhado(
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
  data_entrada   date,
  placa          text
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
    m.data_entrada,
    case when s.mostrar_placa then m.placa end
  from public.motorcycles m
  join public.stock_shares s
    on s.token = p_token
   and s.ativo
  where m.status = 'disponivel'
  order by m.marca, m.modelo;
$$;

grant execute
  on function public.estoque_compartilhado(text)
  to anon, authenticated;

notify pgrst, 'reload schema';
