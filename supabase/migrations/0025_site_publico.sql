-- ============================================================
-- BLACKOUT MOTOS - Site publico da loja
-- ============================================================
--
-- O site da loja abre sem login, para qualquer pessoa. Por isso
-- ele nao consulta a tabela de motos: consulta estas funcoes,
-- que devolvem so o que pode aparecer numa vitrine.
--
-- Valor de compra, gastos, fornecedor, placa, chassi e dado de
-- cliente nao saem daqui. Nem moto reservada, vendida ou
-- arquivada - so o que esta disponivel.
--
-- Moto de outra loja entra: a Blackout vende essas tambem, e
-- para o cliente do site nao ha diferenca.
--
-- Cada coluna sai com cast explicito: o tipo declarado aqui
-- precisa bater com o da tabela, senao o Postgres recusa com
-- "structure of query does not match function result type".
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

drop function if exists public.estoque_publico();
drop function if exists public.moto_publica(uuid);

-- ------------------------------------------------------------
-- 1. LISTA DO ESTOQUE
-- ------------------------------------------------------------

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

-- ------------------------------------------------------------
-- 2. UMA MOTO
--
--    Mesma regra da lista. Se a moto for vendida ou arquivada,
--    a pagina dela deixa de existir - o link antigo cai no
--    "moto nao encontrada" em vez de mostrar o que nao esta
--    mais a venda.
-- ------------------------------------------------------------

create function public.moto_publica(p_id uuid)
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

-- Conferencia: o site mostra so moto com foto, entao aqui
-- aparece quantas entram e quais ficam de fora por falta de
-- foto - essas so precisam das fotos para aparecerem.
select
  count(*) filter (where f.fotos > 0) as no_site,
  count(*) filter (where f.fotos = 0) as sem_foto
from public.estoque_publico() e
cross join lateral (
  select count(*) as fotos
    from public.motorcycle_photos p
   where p.motorcycle_id = e.id
) f;

select e.marca, e.modelo, e.versao
  from public.estoque_publico() e
 where not exists (
   select 1 from public.motorcycle_photos p
    where p.motorcycle_id = e.id
 )
 order by e.marca, e.modelo;
