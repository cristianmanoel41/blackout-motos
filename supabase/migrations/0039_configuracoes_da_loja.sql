-- ============================================================
-- BLACKOUT MOTOS - Configuracoes da loja no banco
-- ============================================================
--
-- A tela de Configuracoes guardava tudo no navegador: o valor
-- da transferencia mudado no computador da loja nao valia no
-- celular, e limpar o navegador voltava tudo ao padrao.
--
-- Agora fica numa linha so desta tabela (id sempre 1), a mesma
-- para todo computador e celular.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================


-- ------------------------------------------------------------
-- 1. TABELA
-- ------------------------------------------------------------

create table if not exists public.configuracoes_loja (
  id                  smallint primary key default 1
                      check (id = 1),

  nome_loja           text not null default 'BLACKOUT MOTOS',
  telefone            text not null default '',
  endereco            text not null default '',
  cidade              text not null default 'São José dos Campos - SP',
  valor_transferencia numeric(12,2) not null default 690,
  banco_padrao        text not null default '',

  -- Fica vazio ate alguem salvar pela tela.
  atualizado_em       timestamptz
);

insert into public.configuracoes_loja (id)
values (1)
on conflict (id) do nothing;


-- ------------------------------------------------------------
-- 2. PERMISSÕES
-- ------------------------------------------------------------

alter table public.configuracoes_loja
  enable row level security;

drop policy if exists "acesso total configuracoes_loja"
  on public.configuracoes_loja;

create policy "acesso total configuracoes_loja"
  on public.configuracoes_loja
  for all to authenticated
  using (true) with check (true);

notify pgrst, 'reload schema';

-- Conferencia: deve devolver uma linha.
select * from public.configuracoes_loja;
