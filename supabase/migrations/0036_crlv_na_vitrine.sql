-- ============================================================
-- BLACKOUT MOTOS - CRLV na vitrine, link por link
-- ============================================================
--
-- Loja parceira que financia precisa do CRLV para passar a
-- ficha da moto no banco. O CRLV traz nome e CPF do dono, então
-- é uma escolha de cada link (coluna mostrar_crlv) e começa
-- desligada em todos - igual à placa.
--
-- Duas funções:
--
--   estoque_compartilhado: ganha a coluna tem_crlv, verdadeira
--   só quando o link libera E a moto tem CRLV anexado. É ela
--   que decide se o botão "Baixar CRLV" aparece.
--
--   crlv_da_vitrine: devolve o caminho do CRLV no Storage só
--   se o link estiver ativo, com a opção ligada, e a moto
--   estiver disponível. A rota do site usa este caminho para
--   gerar um link de download que vence em um minuto.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

alter table public.stock_shares
  add column if not exists mostrar_crlv boolean not null default false;

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
  placa          text,
  tem_crlv       boolean
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
    case when s.mostrar_placa then m.placa end,
    s.mostrar_crlv and exists (
      select 1
      from public.motorcycle_inspections i
      where i.motorcycle_id = m.id
        and i.tipo = 'crlv'
    )
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

create or replace function public.crlv_da_vitrine(
  p_token text,
  p_moto  uuid
)
returns table (
  arquivo_path text,
  arquivo_nome text
)
language sql
security definer
stable
set search_path = public
as $$
  select i.arquivo_path, i.arquivo_nome
  from public.stock_shares s
  join public.motorcycles m
    on m.id = p_moto
   and m.status = 'disponivel'
  join public.motorcycle_inspections i
    on i.motorcycle_id = m.id
   and i.tipo = 'crlv'
  where s.token = p_token
    and s.ativo
    and s.mostrar_crlv
  order by i.data desc, i.criado_em desc
  limit 1;
$$;

grant execute
  on function public.crlv_da_vitrine(text, uuid)
  to anon, authenticated;

notify pgrst, 'reload schema';
