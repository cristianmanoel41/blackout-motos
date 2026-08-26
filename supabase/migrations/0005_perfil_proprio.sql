-- ============================================================
-- BLACKOUT MOTOS - CADA USUÁRIO EDITA O PRÓPRIO NOME
-- ============================================================
-- Rode este arquivo inteiro no SQL Editor do Supabase.
--
-- O nome do perfil é o que entra como vendedor nas vendas e
-- o que aparece em "Registrado por". Cada um passa a poder
-- corrigir o seu em Configurações -> Meu Usuário.
--
-- Ninguém consegue alterar o perfil de outra pessoa: a
-- política só libera a linha do próprio usuário.
--
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

alter table public.profiles enable row level security;

drop policy if exists "perfis visiveis para logados"
  on public.profiles;

create policy "perfis visiveis para logados"
  on public.profiles
  for select to authenticated
  using (true);

drop policy if exists "edita o proprio perfil"
  on public.profiles;

create policy "edita o proprio perfil"
  on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ------------------------------------------------------------
-- OPCIONAL: já deixar o seu nome como Cristian.
--
-- Descomente e troque o e-mail pelo do seu login, se preferir
-- resolver por aqui em vez de pela tela de Configurações.
-- ------------------------------------------------------------

-- update public.profiles
--    set nome = 'Cristian'
--  where email = 'seu-email-de-login@exemplo.com';

-- Para conferir como estão os perfis hoje:
-- select id, nome, email, papel from public.profiles;

-- ------------------------------------------------------------
-- FIM
-- ------------------------------------------------------------
