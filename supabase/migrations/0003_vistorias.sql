-- ============================================================
-- BLACKOUT MOTOS - VISTORIAS (CAUTELAR E DE TRANSFERÊNCIA)
-- ============================================================
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Cria a tabela das vistorias e o bucket de arquivos.
-- Nenhuma tabela existente é alterada.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. TABELA
--    Cada linha é um arquivo de vistoria guardado.
--    sale_id só é preenchido na vistoria de transferência,
--    que é anexada no momento da venda.
-- ------------------------------------------------------------

create table if not exists public.motorcycle_inspections (
  id            uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  sale_id       uuid references public.sales(id) on delete set null,
  tipo          text not null check (tipo in ('cautelar', 'transferencia')),
  data          date not null default current_date,
  arquivo_path  text not null,
  arquivo_nome  text not null,
  arquivo_tipo  text,
  tamanho       bigint,
  observacoes   text,
  criado_em     timestamptz not null default now()
);

create index if not exists motorcycle_inspections_moto
  on public.motorcycle_inspections (motorcycle_id);

create index if not exists motorcycle_inspections_sale
  on public.motorcycle_inspections (sale_id);

create index if not exists motorcycle_inspections_tipo
  on public.motorcycle_inspections (tipo, data desc);

-- ------------------------------------------------------------
-- 2. PERMISSÕES DA TABELA (usuário logado)
-- ------------------------------------------------------------

alter table public.motorcycle_inspections enable row level security;

drop policy if exists "acesso total motorcycle_inspections"
  on public.motorcycle_inspections;

create policy "acesso total motorcycle_inspections"
  on public.motorcycle_inspections
  for all to authenticated
  using (true) with check (true);

-- ------------------------------------------------------------
-- 3. BUCKET DOS ARQUIVOS
--    Privado: o arquivo só abre por link assinado, gerado
--    pelo sistema para quem está logado.
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('vistorias', 'vistorias', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 4. PERMISSÕES DO BUCKET
-- ------------------------------------------------------------

do $$
declare
  acao text;
begin
  foreach acao in array array[
    'select',
    'insert',
    'update',
    'delete'
  ]
  loop
    execute format(
      'drop policy if exists "vistorias %1$s" on storage.objects',
      acao
    );
  end loop;

  execute $politica$
    create policy "vistorias select" on storage.objects
      for select to authenticated
      using (bucket_id = 'vistorias')
  $politica$;

  execute $politica$
    create policy "vistorias insert" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'vistorias')
  $politica$;

  execute $politica$
    create policy "vistorias update" on storage.objects
      for update to authenticated
      using (bucket_id = 'vistorias')
      with check (bucket_id = 'vistorias')
  $politica$;

  execute $politica$
    create policy "vistorias delete" on storage.objects
      for delete to authenticated
      using (bucket_id = 'vistorias')
  $politica$;
end;
$$;

-- ------------------------------------------------------------
-- FIM
-- ------------------------------------------------------------
