-- ============================================================
-- BLACKOUT MOTOS - Anotacoes do dia
-- ============================================================
--
-- No meio do atendimento sai R$40 de almoco, R$80 de gasolina.
-- Parar tudo para lancar direito nao da, e deixar para depois
-- e como o dinheiro some do controle.
--
-- Aqui a loja escreve a linha na hora - descricao e valor - e
-- ela fica numa fila de "ainda nao lancado". Depois, com
-- calma, cada anotacao vira uma despesa de verdade.
--
-- Anotacao NAO e lancamento: nao entra no caixa, nao mexe no
-- lucro, nao aparece em relatorio. E lembrete.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

create extension if not exists pgcrypto;


-- ------------------------------------------------------------
-- 1. TABELA
-- ------------------------------------------------------------

create table if not exists public.anotacoes_diarias (
  id          uuid primary key default gen_random_uuid(),

  data        date not null default current_date,
  descricao   text not null,
  valor       numeric(12,2) not null,

  -- Vira true quando a anotacao ja virou despesa.
  lancada     boolean not null default false,
  lancada_em  timestamptz,

  -- A despesa que nasceu desta anotacao, quando houver.
  store_expense_id uuid
              references public.store_expenses(id)
              on delete set null,

  criado_em   timestamptz not null default now()
);

create index if not exists anotacoes_diarias_data
  on public.anotacoes_diarias (data desc);

create index if not exists anotacoes_diarias_pendentes
  on public.anotacoes_diarias (lancada, data desc);


-- ------------------------------------------------------------
-- 2. PERMISSÕES
-- ------------------------------------------------------------

alter table public.anotacoes_diarias
  enable row level security;

drop policy if exists "acesso total anotacoes_diarias"
  on public.anotacoes_diarias;

create policy "acesso total anotacoes_diarias"
  on public.anotacoes_diarias
  for all to authenticated
  using (true) with check (true);


-- ------------------------------------------------------------
-- 3. AUTORIA
-- ------------------------------------------------------------

alter table public.anotacoes_diarias
  add column if not exists created_by uuid;

alter table public.anotacoes_diarias
  add column if not exists updated_by uuid;

alter table public.anotacoes_diarias
  add column if not exists atualizado_em timestamptz;

create or replace trigger trg_autoria
  before insert or update on public.anotacoes_diarias
  for each row execute function public.registrar_autoria();


notify pgrst, 'reload schema';


-- ------------------------------------------------------------
-- 4. CONFERÊNCIA
-- ------------------------------------------------------------

select count(*) as tabela_criada
from information_schema.tables
where table_schema = 'public'
  and table_name = 'anotacoes_diarias';
