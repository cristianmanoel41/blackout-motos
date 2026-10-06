-- ============================================================
-- BLACKOUT MOTOS - CONTRATO ASSINADO PARA O CLIENTE
-- ============================================================
-- Rode este arquivo inteiro no SQL Editor do Supabase.
--
-- Para que serve:
--   1. A loja imprime o contrato, as duas partes assinam.
--   2. Alguém escaneia pelo celular e sobe aqui.
--   3. O sistema gera um link e manda no WhatsApp do cliente.
--   4. O link vale para sempre - e a loja pode revogar quando
--      quiser, o que apaga o arquivo de verdade.
--
-- O balde é FECHADO. Diferente das fotos das motos, aqui tem
-- CPF, endereço e assinatura: ninguém lê sem estar logado, e a
-- página do cliente só funciona porque o servidor do site lê
-- por ela, depois de conferir o token.
--
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. OS CONTRATOS ESCANEADOS
-- ------------------------------------------------------------

create table if not exists public.contratos_assinados (
  id         uuid primary key default gen_random_uuid(),

  /* De qual venda é o contrato. Apagou a venda, some junto. */
  venda_id   uuid not null
             references public.sales(id) on delete cascade,

  /* O código do link. Sem hífen para caber melhor na mensagem
     de WhatsApp, e longo o bastante para ninguém adivinhar. */
  token      text not null unique
             default replace(gen_random_uuid()::text, '-', ''),

  /* Onde o arquivo mora dentro do balde. */
  arquivo    text not null,

  /* Quantas folhas foram escaneadas. Serve para a loja
     perceber, meses depois, que faltou uma página. */
  paginas    integer not null default 1,

  /* Revogar não apaga a linha: a loja precisa saber que
     existiu, quando foi e quem cortou. */
  ativo      boolean not null default true,
  revogado_em timestamptz,

  criado_em  timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists contratos_assinados_venda
  on public.contratos_assinados (venda_id);

create index if not exists contratos_assinados_token
  on public.contratos_assinados (token)
  where ativo;

alter table public.contratos_assinados enable row level security;

drop policy if exists "acesso total contratos_assinados"
  on public.contratos_assinados;

/* Só quem está logado sobe, vê e revoga. O cliente não chega
   nesta tabela: ele passa pela função abaixo. */
create policy "acesso total contratos_assinados"
  on public.contratos_assinados
  for all to authenticated
  using (true) with check (true);

-- ------------------------------------------------------------
-- 2. O QUE O CLIENTE ENXERGA
--
--    security definer: a função lê a tabela por conta própria,
--    então não é preciso liberar nada para visitante. Sem token
--    válido, ou com o link revogado, devolve vazio.
--
--    Não devolve nada da venda além do nome da loja: quem tem o
--    link vê o contrato dele, não a ficha do negócio.
-- ------------------------------------------------------------

create or replace function public.contrato_assinado(
  p_token text
)
returns table (
  arquivo   text,
  paginas   integer,
  criado_em timestamptz
)
language sql
security definer
set search_path = public
as $$
  select c.arquivo, c.paginas, c.criado_em
  from public.contratos_assinados c
  where c.token = p_token
    and c.ativo
  limit 1;
$$;

revoke all on function public.contrato_assinado(text) from public;

grant execute
  on function public.contrato_assinado(text)
  to anon, authenticated;

-- ------------------------------------------------------------
-- 3. O BALDE, FECHADO
--
--    public = false: ao contrário de fotos-motos, aqui não há
--    leitura aberta. Nem com o endereço exato em mãos.
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('contratos-assinados', 'contratos-assinados', false)
on conflict (id) do update set public = false;

do $$
declare
  acao text;
begin
  foreach acao in array array['select','insert','update','delete']
  loop
    execute format(
      'drop policy if exists "contratos-assinados %1$s" on storage.objects',
      acao
    );
  end loop;

  /* Tudo só para quem está logado - inclusive ler. */
  execute $politica$
    create policy "contratos-assinados select" on storage.objects
      for select to authenticated
      using (bucket_id = 'contratos-assinados')
  $politica$;

  execute $politica$
    create policy "contratos-assinados insert" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'contratos-assinados')
  $politica$;

  execute $politica$
    create policy "contratos-assinados update" on storage.objects
      for update to authenticated
      using (bucket_id = 'contratos-assinados')
      with check (bucket_id = 'contratos-assinados')
  $politica$;

  execute $politica$
    create policy "contratos-assinados delete" on storage.objects
      for delete to authenticated
      using (bucket_id = 'contratos-assinados')
  $politica$;
end;
$$;

-- ------------------------------------------------------------
-- 4. CONFERÊNCIA
-- ------------------------------------------------------------

select
  (select count(*) from public.contratos_assinados)        as contratos_ja_guardados,
  (select count(*) from storage.buckets
     where id = 'contratos-assinados')                     as balde_criado,
  (select public from storage.buckets
     where id = 'contratos-assinados')                     as balde_aberto_deve_ser_false,
  (select count(*) from pg_proc
     where proname = 'contrato_assinado')                  as funcao_criada;
