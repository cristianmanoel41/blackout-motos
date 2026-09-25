-- ============================================================
-- BLACKOUT MOTOS - Escolher quais motos aparecem na capa
-- ============================================================
--
-- Ate agora a capa do site mostrava as quatro motos que
-- entraram por ultimo, sem ninguem poder escolher. Isso e bom
-- enquanto nao ha opiniao - mas moto com foto fraca, preco
-- desatualizado ou que a loja nao quer como cartao de visita
-- acabava indo para a vitrine do mesmo jeito.
--
-- Agora a ficha tem uma chave: "mostrar na capa".
--
-- Se NENHUMA moto estiver marcada, a capa volta a fazer o que
-- fazia: mostrar as ultimas que entraram. Assim o site nunca
-- fica com a capa vazia por esquecimento.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

-- ------------------------------------------------------------
-- 1. A MARCACAO
-- ------------------------------------------------------------

alter table public.motorcycles
  add column if not exists na_capa boolean not null default false;

create index if not exists motorcycles_na_capa
  on public.motorcycles (na_capa)
  where na_capa;

-- ------------------------------------------------------------
-- 2. O SITE PRECISA ENXERGAR A MARCACAO
--
--    A funcao devolve colunas fixas, entao ela e refeita com a
--    coluna nova. Continua devolvendo so o que e de vitrine -
--    valor de compra, fornecedor, placa e chassi seguem fora.
-- ------------------------------------------------------------

drop function if exists public.estoque_publico();

create function public.estoque_publico()
returns table (
  id                   uuid,
  marca                text,
  modelo               text,
  versao               text,
  cor                  text,
  ano_fabricacao       text,
  ano_modelo           text,
  quilometragem        numeric,
  cilindrada           text,
  preco_anunciado      numeric,
  possui_manual        boolean,
  possui_chave_reserva boolean,
  unico_dono           boolean,
  data_entrada         date,
  na_capa              boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    m.id::uuid,
    m.marca::text,
    m.modelo::text,
    m.versao::text,
    m.cor::text,
    m.ano_fabricacao::text,
    m.ano_modelo::text,
    m.quilometragem::numeric,
    m.cilindrada::text,
    m.preco_anunciado::numeric,
    m.possui_manual::boolean,
    m.possui_chave_reserva::boolean,
    m.unico_dono::boolean,
    m.data_entrada::date,
    coalesce(m.na_capa, false)::boolean
  from public.motorcycles m
  where m.status = 'disponivel'
  order by m.data_entrada desc nulls last;
$$;

grant execute
  on function public.estoque_publico()
  to anon, authenticated;

notify pgrst, 'reload schema';

-- Conferencia: quantas estao marcadas para a capa.
select count(*) filter (where na_capa) as na_capa,
       count(*)                        as disponiveis
from public.motorcycles
where status = 'disponivel';
