-- ============================================================
-- BLACKOUT MOTOS - Histórico dos valores alterados
-- ============================================================
--
-- O sistema guarda o valor atual, nao o anterior. Quando um
-- valor e corrigido, o numero antigo simplesmente desaparece -
-- e ja aconteceu de precisar dele de volta e nao haver de onde
-- tirar.
--
-- Aqui toda mudanca de valor em dinheiro fica registrada: de
-- quanto para quanto, em que registro, por quem e quando.
-- Nada e apagado, so acrescentado.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- ============================================================


-- ------------------------------------------------------------
-- 1. A TABELA
-- ------------------------------------------------------------

create table if not exists public.historico_valores (
  id             uuid primary key default gen_random_uuid(),

  tabela         text not null,
  registro_id    text not null,
  campo          text not null,

  valor_anterior numeric(12,2),
  valor_novo     numeric(12,2),

  /* O que era o registro, para reconhecer sem ir atrás. */
  referencia     text,

  alterado_por   uuid,
  alterado_em    timestamptz not null default now()
);

create index if not exists historico_valores_data_idx
  on public.historico_valores (alterado_em desc);

create index if not exists historico_valores_registro_idx
  on public.historico_valores (tabela, registro_id);

alter table public.historico_valores
  enable row level security;

drop policy if exists "historico visivel para logados"
  on public.historico_valores;

create policy "historico visivel para logados"
  on public.historico_valores
  for select to authenticated
  using (true);

/* O gatilho grava; ninguém edita nem apaga pela tela. */
drop policy if exists "historico gravado pelo sistema"
  on public.historico_valores;

create policy "historico gravado pelo sistema"
  on public.historico_valores
  for insert to authenticated
  with check (true);


-- ------------------------------------------------------------
-- 2. O GATILHO
--
-- Recebe o nome da coluna de valor como argumento, entao um
-- gatilho so serve para todas as tabelas.
-- ------------------------------------------------------------

create or replace function public.registrar_mudanca_valor()
returns trigger
language plpgsql
as $$
declare
  campo     text := tg_argv[0];
  anterior  numeric;
  novo      numeric;
  descricao text;
begin
  anterior := nullif(to_jsonb(old) ->> campo, '')::numeric;
  novo     := nullif(to_jsonb(new) ->> campo, '')::numeric;

  if anterior is not distinct from novo then
    return new;
  end if;

  /*
   * Uma pista de qual registro é: cada tabela guarda o nome
   * num campo diferente.
   */
  descricao := coalesce(
    to_jsonb(new) ->> 'descricao',
    to_jsonb(new) ->> 'cliente',
    to_jsonb(new) ->> 'codigo',
    to_jsonb(new) ->> 'categoria',
    ''
  );

  insert into public.historico_valores (
    tabela,
    registro_id,
    campo,
    valor_anterior,
    valor_novo,
    referencia,
    alterado_por
  )
  values (
    tg_table_name,
    (to_jsonb(new) ->> 'id'),
    campo,
    anterior,
    novo,
    descricao,
    auth.uid()
  );

  return new;
end;
$$;


-- ------------------------------------------------------------
-- 3. ONDE VIGIAR
-- ------------------------------------------------------------

do $$
declare
  alvo record;
begin
  for alvo in
    select *
      from (values
        ('motorcycles',              'valor_compra'),
        ('motorcycles',              'preco_anunciado'),
        ('sales',                    'valor_total_venda'),
        ('sales',                    'valor_financiado'),
        ('sales',                    'transferencia_cliente'),
        ('motorcycle_expenses',      'valor'),
        ('store_expenses',           'valor'),
        ('cash_transactions',        'valor'),
        ('sale_payment_components',  'valor'),
        ('sale_documentation_costs', 'valor')
      ) as t(tabela, campo)
  loop
    if to_regclass('public.' || alvo.tabela) is null then
      continue;
    end if;

    execute format(
      'create or replace trigger trg_historico_%s
         after update on public.%I
         for each row
         execute function public.registrar_mudanca_valor(%L)',
      alvo.campo,
      alvo.tabela,
      alvo.campo
    );
  end loop;
end $$;


-- ------------------------------------------------------------
-- 4. CACHE DO POSTGREST
-- ------------------------------------------------------------

notify pgrst, 'reload schema';


-- ------------------------------------------------------------
-- 5. CONFERÊNCIA
-- ------------------------------------------------------------

select count(*) as gatilhos_de_historico
  from pg_trigger
 where tgname like 'trg_historico_%';
