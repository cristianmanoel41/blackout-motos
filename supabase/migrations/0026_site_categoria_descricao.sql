-- ============================================================
-- BLACKOUT MOTOS - Categoria e descricao no site
-- ============================================================
--
-- A pagina da moto mostra categoria e descricao, que ja existem
-- na tabela mas nao saiam nas funcoes publicas.
--
-- Nenhuma coluna nova: so as funcoes 0025 recriadas com mais
-- dois campos. Nada e apagado nem alterado na tabela.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

drop function if exists public.estoque_publico();
drop function if exists public.moto_publica(uuid);

create function public.estoque_publico()
returns table (
  id                   uuid,
  marca                text,
  modelo               text,
  versao               text,
  cor                  text,
  categoria            text,
  descricao            text,
  ano_fabricacao       text,
  ano_modelo           text,
  quilometragem        numeric,
  cilindrada           text,
  preco_anunciado      numeric,
  possui_manual        boolean,
  possui_chave_reserva boolean,
  unico_dono           boolean,
  data_entrada         date
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
    m.categoria::text,
    m.descricao::text,
    m.ano_fabricacao::text,
    m.ano_modelo::text,
    m.quilometragem::numeric,
    m.cilindrada::text,
    m.preco_anunciado::numeric,
    m.possui_manual::boolean,
    m.possui_chave_reserva::boolean,
    m.unico_dono::boolean,
    m.data_entrada::date
  from public.motorcycles m
  where m.status = 'disponivel'
  order by m.data_entrada desc nulls last;
$$;

grant execute
  on function public.estoque_publico()
  to anon, authenticated;

create function public.moto_publica(p_id uuid)
returns table (
  id                   uuid,
  marca                text,
  modelo               text,
  versao               text,
  cor                  text,
  categoria            text,
  descricao            text,
  ano_fabricacao       text,
  ano_modelo           text,
  quilometragem        numeric,
  cilindrada           text,
  preco_anunciado      numeric,
  possui_manual        boolean,
  possui_chave_reserva boolean,
  unico_dono           boolean,
  data_entrada         date
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
    m.categoria::text,
    m.descricao::text,
    m.ano_fabricacao::text,
    m.ano_modelo::text,
    m.quilometragem::numeric,
    m.cilindrada::text,
    m.preco_anunciado::numeric,
    m.possui_manual::boolean,
    m.possui_chave_reserva::boolean,
    m.unico_dono::boolean,
    m.data_entrada::date
  from public.motorcycles m
  where m.id = p_id
    and m.status = 'disponivel';
$$;

grant execute
  on function public.moto_publica(uuid)
  to anon, authenticated;

notify pgrst, 'reload schema';

-- Conferencia: o site mostra so moto com foto.
select
  count(*) filter (where f.fotos > 0) as no_site,
  count(*) filter (where f.fotos = 0) as sem_foto
from public.estoque_publico() e
cross join lateral (
  select count(*) as fotos
    from public.motorcycle_photos p
   where p.motorcycle_id = e.id
     and coalesce(p.arquivo_tipo, '') not like 'video/%'
) f;
