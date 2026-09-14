-- ============================================================
-- BLACKOUT MOTOS - Completa a tabela de fotos da moto
-- ============================================================
--
-- A tabela motorcycle_photos ja existia de um plano antigo,
-- com id, motorcycle_id, ordem, criado_em, url e principal -
-- e vazia, sem nenhuma linha e sem nenhuma tela usando.
--
-- Por isso a migracao 0017 nao criou nada: "create table if
-- not exists" viu a tabela de pe e passou direto. Aqui o que
-- falta e acrescentado, mantendo os nomes que ja estavam.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================


-- ------------------------------------------------------------
-- 1. COLUNAS QUE FALTAM
--
-- url e principal ficam como estao. O caminho no balde e
-- preciso para apagar o arquivo junto com o registro.
-- ------------------------------------------------------------

alter table public.motorcycle_photos
  add column if not exists arquivo_path text;

alter table public.motorcycle_photos
  add column if not exists arquivo_nome text;

alter table public.motorcycle_photos
  add column if not exists arquivo_tipo text;

alter table public.motorcycle_photos
  add column if not exists tamanho bigint;

alter table public.motorcycle_photos
  add column if not exists legenda text;


-- ------------------------------------------------------------
-- 2. SO UMA CAPA POR MOTO
--
-- Indice parcial: o banco recusa uma segunda principal na
-- mesma moto, entao nao adianta a tela errar.
-- ------------------------------------------------------------

create unique index if not exists motorcycle_photos_uma_principal
  on public.motorcycle_photos (motorcycle_id)
  where principal;

create index if not exists motorcycle_photos_moto
  on public.motorcycle_photos (motorcycle_id, ordem);


-- ------------------------------------------------------------
-- 3. PERMISSÕES
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
-- 4. AUTORIA
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
-- 5. CONFERÊNCIA
--
-- Deve listar as colunas que a tela usa.
-- ------------------------------------------------------------

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'motorcycle_photos'
  and column_name in (
    'url', 'principal', 'ordem',
    'arquivo_path', 'arquivo_nome', 'tamanho', 'legenda'
  )
order by column_name;
