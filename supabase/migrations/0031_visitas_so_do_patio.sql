-- ============================================================
-- BLACKOUT MOTOS - As motos mais vistas: so as que estao no patio
-- ============================================================
--
-- A lista mostrava tambem moto vendida e moto arquivada. A ideia
-- era que saber "a Twister vendeu com 60 visitas" ensinaria o
-- que esperar da proxima.
--
-- Na pratica nao serve: o painel existe para decidir o que fazer
-- HOJE - qual moto baixar o preco, qual trocar a foto. Moto que
-- ja saiu do patio ocupa linha e nao aceita decisao nenhuma, e
-- empurra para baixo a que ainda esta para vender.
--
-- Agora entra so o que esta no patio: disponivel, reservada e
-- em manutencao. E o mesmo criterio do card "Total em estoque".
--
-- Moto apagada do cadastro ja saia sozinha: a visita guarda o id
-- com "on delete set null", entao a linha perde a moto e nao
-- encontra par no cruzamento.
--
-- As visitas continuam todas guardadas - o que muda e so quem
-- aparece nesta lista. O total de telas e de fichas no resumo
-- segue contando tudo.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

create or replace function public.visitas_por_moto(
  p_dias   int default 7,
  p_quanto int default 10
)
returns table (
  moto_id         uuid,
  marca           text,
  modelo          text,
  versao          text,
  ano_modelo      text,
  preco_anunciado numeric,
  status          text,
  data_entrada    date,
  visitas         bigint,
  whatsapp        bigint
)
language sql
stable
as $$
  select
    v.moto_id,
    m.marca::text,
    m.modelo::text,
    m.versao::text,
    m.ano_modelo::text,
    m.preco_anunciado::numeric,
    m.status::text,
    m.data_entrada::date,
    count(*) filter (where v.tipo = 'pagina'),
    count(*) filter (where v.tipo = 'whatsapp')
  from public.visitas_site v
  join public.motorcycles m on m.id = v.moto_id
  where v.criado_em >= public.visitas_inicio(p_dias)
    -- So o que ainda esta no patio.
    and lower(coalesce(m.status, '')) in (
      'disponivel', 'reservada', 'manutencao'
    )
  group by
    v.moto_id, m.marca, m.modelo, m.versao,
    m.ano_modelo, m.preco_anunciado, m.status, m.data_entrada
  having count(*) filter (where v.tipo = 'pagina') > 0
  order by
    count(*) filter (where v.tipo = 'pagina') desc,
    count(*) filter (where v.tipo = 'whatsapp') desc
  limit greatest(coalesce(p_quanto, 10), 1);
$$;

revoke execute on function public.visitas_por_moto(int, int)
  from public, anon;

grant execute on function public.visitas_por_moto(int, int)
  to authenticated;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Conferencia: as motos mais vistas nos ultimos 30 dias.
-- ------------------------------------------------------------

select marca, modelo, status, visitas, whatsapp
  from public.visitas_por_moto(30, 10);
