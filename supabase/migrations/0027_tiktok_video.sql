-- ============================================================
-- BLACKOUT MOTOS - Mandar video para o rascunho do TikTok
-- ============================================================
--
-- A migracao 0020 criou as tabelas quando a ideia era postar
-- foto. Agora o que vai e video, e para o rascunho: o sistema
-- entrega o arquivo, e quem publica e a loja, pelo aplicativo.
--
-- Aqui so completamos o que faltava:
--   - saber ate quando vale a autorizacao (refresh de 365 dias)
--   - saber qual video da ficha foi mandado
--
-- O token de acesso vale 24 horas e e renovado sozinho pelo
-- sistema. O refresh vale um ano; passou disso, a loja precisa
-- autorizar de novo.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

-- ------------------------------------------------------------
-- 1. A CONTA
-- ------------------------------------------------------------

alter table public.tiktok_conta
  add column if not exists refresh_expira_em timestamptz;

alter table public.tiktok_conta
  add column if not exists escopo text;

-- ------------------------------------------------------------
-- 2. O QUE JA FOI MANDADO
--
--    Guardar qual video foi e como terminou evita mandar a
--    mesma moto duas vezes sem querer - o rascunho no TikTok
--    nao avisa que ja tem um igual la dentro.
-- ------------------------------------------------------------

alter table public.tiktok_posts
  add column if not exists foto_id uuid
    references public.motorcycle_photos(id) on delete set null;

alter table public.tiktok_posts
  add column if not exists tipo text not null default 'video';

-- Quem mandou, para o historico fazer sentido a duas maos.
alter table public.tiktok_posts
  add column if not exists enviado_por uuid;

create index if not exists tiktok_posts_foto
  on public.tiktok_posts (foto_id);

notify pgrst, 'reload schema';

-- Conferencia.
select
  (select count(*) from public.tiktok_conta) as contas,
  (select count(*) from public.tiktok_posts) as envios;
