-- ============================================================
-- BLACKOUT MOTOS - Medicao propria das visitas ao site
-- ============================================================
--
-- A Vercel ja conta quanta gente entrou. O que ela nao sabe e
-- que /estoque/honda-cg-160-2022 e uma moto de R$ 12.900 parada
-- ha 40 dias no patio. Esta tabela sabe: cada visita guarda o
-- id da moto, e o painel cruza com o estoque.
--
-- Quatro perguntas que so daqui saem:
--   1. Qual moto todo mundo olha e ninguem chama?
--   2. Quantas visitas viram conversa no WhatsApp?
--   3. De onde vem a gente - Instagram, Google, OLX, anuncio?
--   4. Que dia e que hora o site enche?
--
-- NAO guarda quem: sem cookie, sem id de visitante, sem IP.
-- Guarda o que foi visto, de onde veio e quando. Isso responde
-- as quatro perguntas sem saber de ninguem - e por isso nao
-- entra no aviso de cookies, igual a contagem da Vercel.
--
-- O registro vem de visitante sem login, entao a tabela NAO e
-- aberta: quem insere e uma funcao com permissao propria, que
-- so aceita esses campos e devolve apenas "true". As funcoes de
-- leitura sao de quem esta logado.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. TABELA
-- ------------------------------------------------------------

create table if not exists public.visitas_site (
  id          uuid primary key default gen_random_uuid(),

  -- 'pagina'   = alguem abriu uma tela do site
  -- 'whatsapp' = alguem clicou para chamar a loja
  tipo        text not null default 'pagina',

  -- O endereco, do jeito que aparece na barra: /estoque/...
  caminho     text not null,

  -- A moto da ficha aberta. Fica nulo nas outras telas.
  --
  -- Guardar o id, e nao o endereco, e o que faz o numero
  -- sobreviver: moto vendida sai do site, e alguem corrigindo
  -- o modelo muda o endereco dela. O id nao muda.
  moto_id     uuid references public.motorcycles(id)
                on delete set null,

  -- De onde a pessoa veio, so na tela em que ela entrou:
  -- Instagram, Google, OLX, Direto. Nulo quando e so mais uma
  -- tela da mesma visita - senao cada clique dentro do site
  -- contaria como gente nova chegando.
  origem      text,

  -- O endereco cru de onde ela veio, para quando a classificacao
  -- acima disser "Outro site" e alguem quiser saber qual.
  referencia  text,

  -- utm_campaign, quando o link tem. E assim que se sabe qual
  -- anuncio trouxe a pessoa, e nao so qual rede.
  campanha    text,

  -- celular, computador ou tablet.
  dispositivo text,

  criado_em   timestamptz not null default now()
);

-- Tudo que o painel pergunta comeca por data.
create index if not exists visitas_site_criado
  on public.visitas_site (criado_em desc);

-- O ranking de motos mais vistas.
create index if not exists visitas_site_moto
  on public.visitas_site (moto_id, criado_em desc)
  where moto_id is not null;

-- ------------------------------------------------------------
-- 2. PERMISSOES
--
--    Quem esta logado no sistema le tudo. O visitante nao toca
--    na tabela: ele chama a funcao da seccao 3.
-- ------------------------------------------------------------

alter table public.visitas_site enable row level security;

drop policy if exists "acesso total visitas" on public.visitas_site;

create policy "acesso total visitas"
  on public.visitas_site
  for all to authenticated
  using (true) with check (true);

-- ------------------------------------------------------------
-- 3. REGISTRO, FEITO PELO SITE
--
--    Recusa o que nao reconhece em vez de gravar sujeira, e
--    corta o tamanho de cada campo: e endereco vindo do
--    navegador, e navegador aceita endereco de qualquer
--    tamanho.
--
--    Nao devolve dado nenhum, so "true". Funcao publica que
--    devolve linha vira porta para ler a tabela inteira.
-- ------------------------------------------------------------

create or replace function public.registrar_visita(
  p_caminho     text,
  p_tipo        text default 'pagina',
  p_moto        uuid default null,
  p_origem      text default null,
  p_referencia  text default null,
  p_campanha    text default null,
  p_dispositivo text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  endereco text;
  qual     uuid;
begin
  endereco := btrim(coalesce(p_caminho, ''));

  if endereco = '' then
    return false;
  end if;

  if coalesce(p_tipo, '') not in ('pagina', 'whatsapp') then
    return false;
  end if;

  -- Moto que nao existe mais nao derruba o registro: a visita
  -- aconteceu, e vale contar mesmo sem saber de qual moto era.
  select m.id into qual
    from public.motorcycles m
   where m.id = p_moto;

  insert into public.visitas_site (
    tipo, caminho, moto_id, origem,
    referencia, campanha, dispositivo
  )
  values (
    p_tipo,
    left(endereco, 200),
    qual,
    left(nullif(btrim(coalesce(p_origem, '')), ''), 40),
    left(nullif(btrim(coalesce(p_referencia, '')), ''), 200),
    left(nullif(btrim(coalesce(p_campanha, '')), ''), 80),
    left(nullif(btrim(coalesce(p_dispositivo, '')), ''), 20)
  );

  return true;
end;
$$;

grant execute on function public.registrar_visita(
  text, text, uuid, text, text, text, text
) to anon, authenticated;

-- ------------------------------------------------------------
-- 4. O COMECO DA JANELA, NO HORARIO DAQUI
--
--    O banco trabalha em UTC. Sem fixar o fuso, das 21h em
--    diante o "hoje" da loja ja seria o dia seguinte la, e o
--    painel zeraria no meio do expediente.
--
--    p_dias conta o dia de hoje: 1 = hoje, 7 = esta semana.
-- ------------------------------------------------------------

create or replace function public.visitas_inicio(p_dias int)
returns timestamptz
language sql
stable
as $$
  select (
    date_trunc('day', (now() at time zone 'America/Sao_Paulo'))
    - make_interval(days => greatest(coalesce(p_dias, 1), 1) - 1)
  ) at time zone 'America/Sao_Paulo';
$$;

-- ------------------------------------------------------------
-- 5. O RESUMO
--
--    Telas abertas, fichas de moto abertas e cliques no
--    WhatsApp. As fichas e os cliques juntos dizem o que
--    interessa: de cada dez pessoas que abriram uma moto,
--    quantas chamaram.
-- ------------------------------------------------------------

create or replace function public.visitas_resumo(p_dias int default 7)
returns table (
  telas    bigint,
  fichas   bigint,
  whatsapp bigint
)
language sql
stable
as $$
  select
    count(*) filter (where tipo = 'pagina'),
    count(*) filter (where tipo = 'pagina' and moto_id is not null),
    count(*) filter (where tipo = 'whatsapp')
  from public.visitas_site
  where criado_em >= public.visitas_inicio(p_dias);
$$;

-- ------------------------------------------------------------
-- 6. AS MOTOS MAIS VISTAS
--
--    Com o preco e a data de entrada junto, porque o numero
--    sozinho nao decide nada: 40 visitas e nenhum WhatsApp em
--    uma moto parada ha dois meses quer dizer que o preco esta
--    alto. As mesmas 40 visitas em moto que entrou ontem e so
--    o normal.
--
--    Entra moto vendida tambem: saber que a Twister vendeu com
--    60 visitas ensina o que esperar da proxima.
-- ------------------------------------------------------------

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
  group by
    v.moto_id, m.marca, m.modelo, m.versao,
    m.ano_modelo, m.preco_anunciado, m.status, m.data_entrada
  having count(*) filter (where v.tipo = 'pagina') > 0
  order by
    count(*) filter (where v.tipo = 'pagina') desc,
    count(*) filter (where v.tipo = 'whatsapp') desc
  limit greatest(coalesce(p_quanto, 10), 1);
$$;

-- ------------------------------------------------------------
-- 7. DE ONDE VEM A GENTE
--
--    So a tela em que a pessoa entrou tem origem preenchida,
--    entao aqui cada linha e uma chegada, nao uma tela aberta.
-- ------------------------------------------------------------

create or replace function public.visitas_por_origem(p_dias int default 30)
returns table (
  origem   text,
  chegadas bigint,
  whatsapp bigint
)
language sql
stable
as $$
  select
    v.origem::text,
    count(*) filter (where v.tipo = 'pagina'),
    count(*) filter (where v.tipo = 'whatsapp')
  from public.visitas_site v
  where v.criado_em >= public.visitas_inicio(p_dias)
    and v.origem is not null
  group by v.origem
  order by count(*) filter (where v.tipo = 'pagina') desc
  limit 10;
$$;

-- ------------------------------------------------------------
-- 8. O MOVIMENTO, DIA A DIA
--
--    Os dias sem visita precisam aparecer zerados, senao o
--    grafico encosta um dia cheio no outro e some o buraco -
--    que e justamente o que se quer enxergar.
-- ------------------------------------------------------------

create or replace function public.visitas_por_dia(p_dias int default 30)
returns table (
  dia      date,
  visitas  bigint,
  whatsapp bigint
)
language sql
stable
as $$
  with janela as (
    select generate_series(
      date_trunc('day', (now() at time zone 'America/Sao_Paulo'))
        - make_interval(days => greatest(coalesce(p_dias, 30), 1) - 1),
      date_trunc('day', (now() at time zone 'America/Sao_Paulo')),
      interval '1 day'
    ) as inicio
  )
  select
    janela.inicio::date,
    count(v.id) filter (where v.tipo = 'pagina'),
    count(v.id) filter (where v.tipo = 'whatsapp')
  from janela
  left join public.visitas_site v
    on (v.criado_em at time zone 'America/Sao_Paulo') >= janela.inicio
   and (v.criado_em at time zone 'America/Sao_Paulo') <  janela.inicio + interval '1 day'
  group by janela.inicio
  order by janela.inicio;
$$;

-- ------------------------------------------------------------
-- 9. O MOVIMENTO, HORA A HORA
--
--    As 24 horas sempre, mesmo as vazias: e a madrugada vazia
--    que da forma ao pico da tarde.
-- ------------------------------------------------------------

create or replace function public.visitas_por_hora(p_dias int default 30)
returns table (
  hora    int,
  visitas bigint
)
language sql
stable
as $$
  select
    h.hora::int,
    count(v.id)
  from generate_series(0, 23) as h(hora)
  left join public.visitas_site v
    on extract(hour from (v.criado_em at time zone 'America/Sao_Paulo')) = h.hora
   and v.criado_em >= public.visitas_inicio(p_dias)
   and v.tipo = 'pagina'
  group by h.hora
  order by h.hora;
$$;

-- ------------------------------------------------------------
-- 10. QUEM LE
--
--     Leitura e do sistema, nunca do visitante: a tabela conta
--     o que o site inteiro fez, e isso e informacao da loja.
--
--     Tirar de PUBLIC, e nao so de anon: no Postgres toda
--     funcao nova ja nasce liberada para PUBLIC, e anon herda
--     dai. Revogar so de anon nao fecharia porta nenhuma.
--
--     A tranca de verdade continua sendo a RLS da tabela - sem
--     login a consulta volta vazia de qualquer jeito, porque
--     estas funcoes rodam com a permissao de quem chama. Isto
--     aqui e a segunda tranca.
-- ------------------------------------------------------------

revoke execute on function public.visitas_inicio(int)        from public, anon;
revoke execute on function public.visitas_resumo(int)        from public, anon;
revoke execute on function public.visitas_por_moto(int, int) from public, anon;
revoke execute on function public.visitas_por_origem(int)    from public, anon;
revoke execute on function public.visitas_por_dia(int)       from public, anon;
revoke execute on function public.visitas_por_hora(int)      from public, anon;

grant execute on function public.visitas_inicio(int)             to authenticated;
grant execute on function public.visitas_resumo(int)             to authenticated;
grant execute on function public.visitas_por_moto(int, int)      to authenticated;
grant execute on function public.visitas_por_origem(int)         to authenticated;
grant execute on function public.visitas_por_dia(int)            to authenticated;
grant execute on function public.visitas_por_hora(int)           to authenticated;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Conferencia: quantas visitas ja estao guardadas.
-- ------------------------------------------------------------

select count(*) as visitas from public.visitas_site;

-- ------------------------------------------------------------
-- Para apagar as visitas de teste feitas no localhost antes de
-- publicar, descomente e rode a linha abaixo trocando a data:
--
-- delete from public.visitas_site where criado_em < '2026-09-30';
-- ------------------------------------------------------------
