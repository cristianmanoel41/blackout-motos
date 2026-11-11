-- ============================================================
-- BLACKOUT MOTOS - Motos oferecidas pelo site
-- ============================================================
--
-- Quem quer vender (ou dar na troca) a moto preenche a ficha
-- em /compramos-sua-moto. O envio continua abrindo o WhatsApp
-- da loja, mas agora a ficha tambem fica guardada aqui - assim
-- a loja nao perde quem preencheu e desistiu antes de mandar a
-- mensagem, e acompanha cada uma ate fechar ou nao.
--
-- Mesmo modelo da lista de interesse (0026): o visitante NAO
-- toca na tabela. Quem grava e uma funcao com permissao
-- propria, que so aceita os campos da ficha e nao devolve
-- nada. So quem esta logado no sistema le a lista.
--
-- Nada aqui mexe em caixa, estoque ou vendas: a ficha e so um
-- contato. Comprar a moto continua sendo feito em "Comprar moto".
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. TABELA
-- ------------------------------------------------------------

create table if not exists public.motos_oferecidas (
  id              uuid primary key default gen_random_uuid(),

  -- A moto
  marca           text not null,
  modelo          text not null,
  versao          text,
  ano_fabricacao  int,
  ano_modelo      int,
  km              int,
  cor             text,
  placa           text,

  -- A situacao
  intencao        text,            -- 'vender' ou 'trocar'
  financiada      boolean not null default false,
  falta_quitar    numeric(12,2),
  doc_em_dia      text,            -- 'sim', 'nao' ou nulo
  unico_dono      text,
  manual          text,
  chave_reserva   text,
  sinistro        text,
  valor_esperado  numeric(12,2),
  observacoes     text,

  -- O contato
  nome            text not null,
  -- So numeros, com DDD: e assim que o link do WhatsApp usa.
  telefone        text not null,
  cidade          text,

  -- O acompanhamento da loja
  situacao        text not null default 'nova',
  valor_proposta  numeric(12,2),
  anotacao        text,

  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

alter table public.motos_oferecidas
  drop constraint if exists motos_oferecidas_situacao;

alter table public.motos_oferecidas
  add constraint motos_oferecidas_situacao
  check (situacao in ('nova', 'avaliando', 'proposta', 'comprada', 'nao_fechou'));

create index if not exists motos_oferecidas_criado
  on public.motos_oferecidas (criado_em desc);

create index if not exists motos_oferecidas_telefone
  on public.motos_oferecidas (telefone, criado_em desc);

-- ------------------------------------------------------------
-- 2. PERMISSOES
--
--    So quem esta logado no sistema le e administra a lista.
-- ------------------------------------------------------------

alter table public.motos_oferecidas enable row level security;

drop policy if exists "acesso total motos oferecidas"
  on public.motos_oferecidas;

create policy "acesso total motos oferecidas"
  on public.motos_oferecidas
  for all to authenticated
  using (true) with check (true);

-- ------------------------------------------------------------
-- 3. ENVIO PELO SITE
--
--    Recebe a ficha inteira (json), confere e grava.
--
--    Contra clique repetido e robo:
--      - a mesma pessoa (telefone) com a mesma moto nos
--        ultimos 30 minutos troca a ficha pela nova em vez de
--        criar outra - e quem tocou duas vezes no botao, ou
--        voltou para corrigir um campo;
--      - mais de 5 fichas do mesmo telefone em 24 horas sao
--        ignoradas em silencio.
--
--    Nao devolve dado nenhum: so "true". Funcao publica que
--    devolve linha vira porta para ler a lista inteira.
-- ------------------------------------------------------------

create or replace function public.oferecer_moto(p jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome     text := left(btrim(coalesce(p->>'nome', '')), 80);
  v_telefone text := regexp_replace(coalesce(p->>'telefone', ''), '[^0-9]', '', 'g');
  v_marca    text := left(btrim(coalesce(p->>'marca', '')), 40);
  v_modelo   text := left(btrim(coalesce(p->>'modelo', '')), 60);
  v_existe   uuid;
begin
  if length(v_telefone) < 10 or length(v_telefone) > 11 then
    raise exception 'telefone invalido';
  end if;

  if length(v_nome) < 2 then
    raise exception 'nome invalido';
  end if;

  if v_marca = '' or v_modelo = '' then
    raise exception 'moto invalida';
  end if;

  -- Robo ou abuso: o mesmo numero mandando ficha sem parar.
  if (
    select count(*) from public.motos_oferecidas
    where telefone = v_telefone
      and criado_em > now() - interval '24 hours'
  ) >= 5 then
    return true;
  end if;

  -- Tocou duas vezes no botao: atualiza a mesma ficha.
  select id into v_existe
  from public.motos_oferecidas
  where telefone = v_telefone
    and lower(marca) = lower(v_marca)
    and lower(modelo) = lower(v_modelo)
    and criado_em > now() - interval '30 minutes'
    -- Se a loja ja comecou a mexer nela, nao apaga.
    and situacao = 'nova'
    and anotacao is null
  order by criado_em desc
  limit 1;

  if v_existe is not null then
    delete from public.motos_oferecidas where id = v_existe;
  end if;

  insert into public.motos_oferecidas (
    marca, modelo, versao, ano_fabricacao, ano_modelo, km, cor, placa,
    intencao, financiada, falta_quitar, doc_em_dia, unico_dono, manual,
    chave_reserva, sinistro, valor_esperado, observacoes,
    nome, telefone, cidade
  )
  values (
    v_marca,
    v_modelo,
    nullif(left(btrim(coalesce(p->>'versao', '')), 60), ''),
    case when (p->>'ano_fabricacao') ~ '^[0-9]{4}$' then (p->>'ano_fabricacao')::int end,
    case when (p->>'ano_modelo') ~ '^[0-9]{4}$' then (p->>'ano_modelo')::int end,
    case when (p->>'km') ~ '^[0-9]{1,7}$' then (p->>'km')::int end,
    nullif(left(btrim(coalesce(p->>'cor', '')), 30), ''),
    nullif(left(upper(regexp_replace(coalesce(p->>'placa', ''), '[^A-Za-z0-9]', '', 'g')), 7), ''),
    case when p->>'intencao' in ('vender', 'trocar') then p->>'intencao' end,
    coalesce(p->>'financiada', '') = 'true',
    case when (p->>'falta_quitar') ~ '^[0-9]{1,9}(\.[0-9]{1,2})?$' then (p->>'falta_quitar')::numeric end,
    case when p->>'doc_em_dia'    in ('sim', 'nao') then p->>'doc_em_dia' end,
    case when p->>'unico_dono'    in ('sim', 'nao') then p->>'unico_dono' end,
    case when p->>'manual'        in ('sim', 'nao') then p->>'manual' end,
    case when p->>'chave_reserva' in ('sim', 'nao') then p->>'chave_reserva' end,
    case when p->>'sinistro'      in ('sim', 'nao') then p->>'sinistro' end,
    case when (p->>'valor_esperado') ~ '^[0-9]{1,9}(\.[0-9]{1,2})?$' then (p->>'valor_esperado')::numeric end,
    nullif(left(btrim(coalesce(p->>'observacoes', '')), 600), ''),
    v_nome,
    v_telefone,
    nullif(left(btrim(coalesce(p->>'cidade', '')), 60), '')
  );

  return true;
end;
$$;

-- Ninguem alem do site chama a funcao com outros poderes.
revoke all on function public.oferecer_moto(jsonb) from public;

grant execute
  on function public.oferecer_moto(jsonb)
  to anon, authenticated;

notify pgrst, 'reload schema';

-- Conferencia: quantas fichas ja chegaram.
select count(*) as motos_oferecidas from public.motos_oferecidas;
