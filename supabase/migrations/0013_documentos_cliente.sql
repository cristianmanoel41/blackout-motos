-- ============================================================
-- BLACKOUT MOTOS - Documentos do cliente
-- ============================================================
--
-- Na venda a loja pede o documento e o comprovante de endereco
-- do cliente, e hoje essas fotos ficam no celular de alguem.
-- Quando precisa - uma transferencia, uma duvida no contrato -
-- ninguem acha.
--
-- Aqui cada arquivo fica guardado na ficha do cliente, num
-- espaco privado: o arquivo so abre por link assinado, gerado
-- pelo sistema para quem esta logado.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

create extension if not exists pgcrypto;


-- ------------------------------------------------------------
-- 1. TABELA
-- ------------------------------------------------------------

create table if not exists public.customer_documents (
  id           uuid primary key default gen_random_uuid(),

  customer_id  uuid not null
               references public.customers(id) on delete cascade,

  -- documento | comprovante_endereco | outro
  tipo         text not null,

  arquivo_path text not null,
  arquivo_nome text not null,
  arquivo_tipo text,
  tamanho      bigint,
  observacoes  text,

  criado_em    timestamptz not null default now()
);

create index if not exists customer_documents_cliente
  on public.customer_documents (customer_id);


-- ------------------------------------------------------------
-- 2. PERMISSÕES DA TABELA
-- ------------------------------------------------------------

alter table public.customer_documents
  enable row level security;

drop policy if exists "acesso total customer_documents"
  on public.customer_documents;

create policy "acesso total customer_documents"
  on public.customer_documents
  for all to authenticated
  using (true) with check (true);


-- ------------------------------------------------------------
-- 3. BUCKET DOS ARQUIVOS
--
-- Privado: documento de cliente nao pode ficar acessivel por
-- link aberto.
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values (
  'documentos-clientes',
  'documentos-clientes',
  false
)
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
      'drop policy if exists "documentos-clientes %1$s" on storage.objects',
      acao
    );
  end loop;

  execute $politica$
    create policy "documentos-clientes select" on storage.objects
      for select to authenticated
      using (bucket_id = 'documentos-clientes')
  $politica$;

  execute $politica$
    create policy "documentos-clientes insert" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'documentos-clientes')
  $politica$;

  execute $politica$
    create policy "documentos-clientes update" on storage.objects
      for update to authenticated
      using (bucket_id = 'documentos-clientes')
      with check (bucket_id = 'documentos-clientes')
  $politica$;

  execute $politica$
    create policy "documentos-clientes delete" on storage.objects
      for delete to authenticated
      using (bucket_id = 'documentos-clientes')
  $politica$;
end;
$$;


-- ------------------------------------------------------------
-- 5. AUTORIA
-- ------------------------------------------------------------

alter table public.customer_documents
  add column if not exists created_by uuid;

alter table public.customer_documents
  add column if not exists updated_by uuid;

alter table public.customer_documents
  add column if not exists atualizado_em timestamptz;

create or replace trigger trg_autoria
  before insert or update on public.customer_documents
  for each row execute function public.registrar_autoria();


notify pgrst, 'reload schema';


-- ------------------------------------------------------------
-- 6. CONFERÊNCIA
-- ------------------------------------------------------------

select
  (select count(*) from information_schema.tables
    where table_schema = 'public'
      and table_name = 'customer_documents') as tabela,
  (select count(*) from storage.buckets
    where id = 'documentos-clientes') as bucket;
