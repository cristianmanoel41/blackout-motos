-- ============================================================
-- BLACKOUT MOTOS - Lista de interesse do site
-- ============================================================
--
-- Quem visita o site e nao achou a moto certa deixa nome,
-- telefone e, se quiser, a moto que procura. Quando entra moto
-- nova, a loja avisa pelo WhatsApp - e quem disse o modelo e
-- chamado primeiro, quando a moto que chegou e a dele.
--
-- O cadastro vem de visitante sem login, entao a tabela NAO e
-- aberta: quem insere e uma funcao com permissao propria, que
-- so aceita esses tres campos e nao devolve nada de volta. Sem
-- isso, qualquer pessoa poderia ler a lista de telefones dos
-- clientes.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. TABELA
-- ------------------------------------------------------------

create table if not exists public.interessados (
  id         uuid primary key default gen_random_uuid(),

  nome       text not null,
  -- So numeros, com DDD: e assim que o link do WhatsApp usa.
  telefone   text not null,

  -- A moto que a pessoa procura, do jeito que ela escreveu.
  procura    text,

  -- De onde veio o cadastro, para saber o que traz gente.
  origem     text,

  -- Quem ja foi avisado da ultima novidade.
  avisado_em timestamptz,

  criado_em  timestamptz not null default now()
);

-- Para quem ja tinha a tabela da primeira versao.
alter table public.interessados
  add column if not exists procura text;

-- Um telefone, um cadastro.
create unique index if not exists interessados_telefone
  on public.interessados (telefone);

create index if not exists interessados_criado
  on public.interessados (criado_em desc);

-- ------------------------------------------------------------
-- 2. PERMISSOES
--
--    So quem esta logado no sistema le e administra a lista.
--    O visitante nao toca na tabela: ele chama a funcao abaixo.
-- ------------------------------------------------------------

alter table public.interessados enable row level security;

drop policy if exists "acesso total interessados"
  on public.interessados;

create policy "acesso total interessados"
  on public.interessados
  for all to authenticated
  using (true) with check (true);

-- ------------------------------------------------------------
-- 3. CADASTRO PELO SITE
--
--    Recebe nome, telefone e a moto procurada, limpa o telefone
--    e grava. Se o numero ja existe, atualiza em vez de recusar
--    - do ponto de vista de quem se cadastrou de novo, deu
--    certo, e a moto procurada pode ter mudado.
--
--    Nao devolve dado nenhum: so "true". Funcao publica que
--    devolve linha vira porta para ler a lista inteira.
-- ------------------------------------------------------------

-- A versao de tres campos, caso ja exista, sai de cena.
drop function if exists public.cadastrar_interesse(text, text, text);

create or replace function public.cadastrar_interesse(
  p_nome     text,
  p_telefone text,
  p_procura  text default null,
  p_origem   text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  numero text;
  limpo  text;
  moto   text;
begin
  numero := regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g');
  limpo  := btrim(coalesce(p_nome, ''));
  moto   := nullif(btrim(coalesce(p_procura, '')), '');

  -- Telefone brasileiro com DDD tem 10 ou 11 digitos.
  if length(numero) < 10 or length(numero) > 11 then
    raise exception 'telefone invalido';
  end if;

  if length(limpo) < 2 then
    raise exception 'nome invalido';
  end if;

  insert into public.interessados (nome, telefone, procura, origem)
  values (
    left(limpo, 80),
    numero,
    left(moto, 80),
    left(coalesce(p_origem, 'site'), 40)
  )
  on conflict (telefone) do update
    set nome    = excluded.nome,
        -- Quem se cadastrou sem dizer a moto nao apaga o que
        -- tinha dito antes.
        procura = coalesce(excluded.procura, interessados.procura);

  return true;
end;
$$;

grant execute
  on function public.cadastrar_interesse(text, text, text, text)
  to anon, authenticated;

notify pgrst, 'reload schema';

-- Conferencia: quantos ja estao na lista.
select count(*) as interessados from public.interessados;
