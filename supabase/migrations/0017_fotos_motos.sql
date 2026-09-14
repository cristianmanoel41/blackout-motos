-- ============================================================
-- BLACKOUT MOTOS - Fotos da moto
-- ============================================================
--
-- Hoje as fotos da moto vivem no celular de quem tirou. Na
-- hora de anunciar, de mandar para um cliente ou de montar um
-- post, alguem tem que procurar na galeria.
--
-- Aqui elas ficam na ficha da moto, em ordem, com uma marcada
-- como capa.
--
-- O balde e publico de proposito: foto de moto e feita para
-- ser vista - vai para a vitrine, para o WhatsApp do cliente e,
-- mais adiante, para a rede social. Documento de cliente e
-- outra coisa e continua no balde privado.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

create extension if not exists pgcrypto;


-- ------------------------------------------------------------
-- 1. TABELA
-- ------------------------------------------------------------

create table if not exists public.motorcycle_photos (
  id             uuid primary key default gen_random_uuid(),

  motorcycle_id  uuid not null
                 references public.motorcycles(id) on delete cascade,

  arquivo_path   text not null,
  arquivo_nome   text not null,
  arquivo_tipo   text,
  tamanho        bigint,

  -- A que representa a moto na lista e na vitrine.
  capa           boolean not null default false,

  -- Ordem de exibicao; menor aparece primeiro.
  ordem          integer not null default 0,

  legenda        text,

  criado_em      timestamptz not null default now()
);

create index if not exists motorcycle_photos_moto
  on public.motorcycle_photos (motorcycle_id, ordem);


-- ------------------------------------------------------------
-- 2. SO UMA CAPA POR MOTO
--
-- Indice parcial: o banco recusa uma segunda capa na mesma
-- moto, entao nao adianta a tela errar.
-- ------------------------------------------------------------

create unique index if not exists motorcycle_photos_uma_capa
  on public.motorcycle_photos (motorcycle_id)
  where capa;


-- ------------------------------------------------------------
-- 3. PERMISSÕES DA TABELA
-- ------------------------------------------------------------

alter table public.motorcycle_photos
  enable row level security;

drop policy if exists "acesso total motorcycle_photos"
  on public.motorcycle_photos;

create policy "acesso total motorcycle_photos"
  on public.motorcycle_photos
  for all to authenticated
  using (true) with check (true);

-- A vitrine e aberta: quem tem o link ve as fotos.
drop policy if exists "leitura publica motorcycle_photos"
  on public.motorcycle_photos;

create policy "leitura publica motorcycle_photos"
  on public.motorcycle_photos
  for select to anon
  using (true);


-- ------------------------------------------------------------
-- 4. BALDE DOS ARQUIVOS
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('fotos-motos', 'fotos-motos', true)
on conflict (id) do update set public = true;


-- ------------------------------------------------------------
-- 5. PERMISSÕES DO BALDE
--
-- Ver e livre; mexer so quem esta logado.
-- ------------------------------------------------------------

do $$
declare
  acao text;
begin
  foreach acao in array array['select','insert','update','delete']
  loop
    execute format(
      'drop policy if exists "fotos-motos %1$s" on storage.objects',
      acao
    );
  end loop;

  execute $politica$
    create policy "fotos-motos select" on storage.objects
      for select to public
      using (bucket_id = 'fotos-motos')
  $politica$;

  execute $politica$
    create policy "fotos-motos insert" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'fotos-motos')
  $politica$;

  execute $politica$
    create policy "fotos-motos update" on storage.objects
      for update to authenticated
      using (bucket_id = 'fotos-motos')
      with check (bucket_id = 'fotos-motos')
  $politica$;

  execute $politica$
    create policy "fotos-motos delete" on storage.objects
      for delete to authenticated
      using (bucket_id = 'fotos-motos')
  $politica$;
end;
$$;


-- ------------------------------------------------------------
-- 6. AUTORIA
-- ------------------------------------------------------------

alter table public.motorcycle_photos
  add column if not exists created_by uuid;

alter table public.motorcycle_photos
  add column if not exists updated_by uuid;

alter table public.motorcycle_photos
  add column if not exists atualizado_em timestamptz;

create or replace trigger trg_autoria
  before insert or update on public.motorcycle_photos
  for each row execute function public.registrar_autoria();


notify pgrst, 'reload schema';


-- ------------------------------------------------------------
-- 7. CONFERÊNCIA
-- ------------------------------------------------------------

select
  (select count(*) from information_schema.tables
    where table_schema = 'public'
      and table_name = 'motorcycle_photos')      as tabela,
  (select count(*) from storage.buckets
    where id = 'fotos-motos' and public)         as balde_publico;
