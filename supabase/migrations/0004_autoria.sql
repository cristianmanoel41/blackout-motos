-- ============================================================
-- BLACKOUT MOTOS - QUEM CADASTROU E QUEM ALTEROU
-- ============================================================
-- Rode este arquivo inteiro no SQL Editor do Supabase.
--
-- Cada tabela ganha três colunas de autoria:
--   created_by     -> usuário que criou o registro
--   updated_by     -> último usuário que alterou
--   atualizado_em  -> quando foi a última alteração
--
-- O preenchimento é feito por gatilho no banco, não pelo
-- sistema: qualquer caminho que grave (tela, importação,
-- SQL Editor logado) fica registrado do mesmo jeito.
--
-- Os registros que já existem ficam com created_by nulo,
-- porque não há como saber quem os criou.
--
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

-- ------------------------------------------------------------
-- 1. GATILHO
-- ------------------------------------------------------------

create or replace function public.registrar_autoria()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_by := coalesce(new.updated_by, auth.uid());
    new.atualizado_em := now();

    return new;
  end if;

  /*
   * Em alteração, o autor original nunca muda:
   * quem criou continua sendo quem criou.
   */
  new.created_by := old.created_by;
  new.updated_by := coalesce(auth.uid(), old.updated_by);
  new.atualizado_em := now();

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 2. APLICA NAS TABELAS DO SISTEMA
-- ------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'motorcycles',
    'customers',
    'sales',
    'sale_payment_components',
    'motorcycle_expenses',
    'store_expenses',
    'cash_transactions',
    'helmet_models',
    'helmet_purchases',
    'helmet_purchase_items',
    'helmet_sales',
    'helmet_sale_items',
    'motorcycle_inspections'
  ]
  loop
    /* Pula tabela que ainda não exista neste banco. */
    if to_regclass('public.' || t) is null then
      raise notice 'Tabela % nao existe. Pulando.', t;
      continue;
    end if;

    execute format(
      'alter table public.%I
         add column if not exists created_by uuid
         references auth.users(id) on delete set null',
      t
    );

    execute format(
      'alter table public.%I
         add column if not exists updated_by uuid
         references auth.users(id) on delete set null',
      t
    );

    execute format(
      'alter table public.%I
         add column if not exists atualizado_em timestamptz',
      t
    );

    execute format(
      'drop trigger if exists trg_autoria on public.%I',
      t
    );

    execute format(
      'create trigger trg_autoria
         before insert or update on public.%I
         for each row execute function public.registrar_autoria()',
      t
    );

    execute format(
      'create index if not exists %I on public.%I (created_by)',
      t || '_created_by',
      t
    );
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 3. LEITURA DOS PERFIS
--    O sistema mostra o NOME de quem registrou, então todo
--    usuário logado precisa conseguir ler a lista de perfis.
-- ------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "perfis visiveis para logados"
  on public.profiles;

create policy "perfis visiveis para logados"
  on public.profiles
  for select to authenticated
  using (true);

-- ------------------------------------------------------------
-- FIM
-- ------------------------------------------------------------
