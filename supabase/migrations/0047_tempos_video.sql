-- BLACKOUT MOTOS
-- Tempos dos cards do editor de vídeo (pedido de 23/11/2026).
--
-- Execute UMA VEZ no SQL Editor do Supabase. Pode rodar de
-- novo sem problema: "if not exists" / "drop policy if exists"
-- não refazem o que já existe.
--
-- O botão "Salvar estes tempos" do editor (/videos) grava aqui
-- quando cada card entra, quanto tempo fica, a duração da tela
-- final e se ela vem depois do vídeo - assim os tempos valem em
-- qualquer aparelho (PC de casa, loja, celular).
--
-- Uma linha por moto (chave = id da moto) e uma linha "ultimo",
-- com o último salvamento, usada quando a moto não tem a dela.

create table if not exists public.video_tempos (
  chave          text primary key,
  dados          jsonb not null,
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid default auth.uid()
);

-- Só quem está logado no sistema lê e grava.
alter table public.video_tempos enable row level security;

drop policy if exists "acesso autenticado video_tempos"
  on public.video_tempos;

create policy "acesso autenticado video_tempos"
  on public.video_tempos
  for all to authenticated
  using (true) with check (true);
