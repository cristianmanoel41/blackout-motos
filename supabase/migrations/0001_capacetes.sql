-- ============================================================
-- BLACKOUT MOTOS - MÓDULO DE CAPACETES
-- ============================================================
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Ele cria as tabelas novas do módulo de capacetes e, no final,
-- APENAS AMPLIA a constraint de cash_transactions.origem
-- (sem apagar nem alterar nenhum registro existente).
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. MODELOS DE CAPACETE (catálogo + estoque + preço padrão)
-- ------------------------------------------------------------

create table if not exists public.helmet_models (
  id                  uuid primary key default gen_random_uuid(),
  produto             text not null default 'Capacete',
  marca               text not null,
  modelo              text not null,
  cor                 text not null default 'Não informada',
  tamanho             text not null default 'Único',
  preco_venda_padrao  numeric(12,2) not null default 0,
  custo_medio         numeric(12,2) not null default 0,
  estoque_atual       integer       not null default 0,
  ativo               boolean       not null default true,
  observacoes         text,
  criado_em           timestamptz   not null default now()
);

-- Colunas novas em bancos que já rodaram uma versão anterior deste arquivo.
alter table public.helmet_models
  add column if not exists produto text not null default 'Capacete';

alter table public.helmet_models
  add column if not exists cor text not null default 'Não informada';

drop index if exists public.helmet_models_unico;

create unique index if not exists helmet_models_unico
  on public.helmet_models (
    lower(marca),
    lower(modelo),
    lower(cor),
    lower(tamanho)
  );

-- ------------------------------------------------------------
-- 2. COMPRAS (nota fiscal do fornecedor)
-- ------------------------------------------------------------

create table if not exists public.helmet_purchases (
  id           uuid primary key default gen_random_uuid(),
  data_compra  date not null,
  numero_nota  text,
  fornecedor   text,
  valor_total  numeric(12,2) not null default 0,
  lancar_caixa boolean not null default true,
  observacoes  text,
  criado_em    timestamptz not null default now()
);

create table if not exists public.helmet_purchase_items (
  id              uuid primary key default gen_random_uuid(),
  purchase_id     uuid not null references public.helmet_purchases(id) on delete cascade,
  helmet_model_id uuid not null references public.helmet_models(id) on delete restrict,
  quantidade      integer       not null check (quantidade > 0),
  custo_unitario  numeric(12,2) not null check (custo_unitario >= 0),
  criado_em       timestamptz   not null default now()
);

create index if not exists helmet_purchase_items_purchase
  on public.helmet_purchase_items (purchase_id);

-- ------------------------------------------------------------
-- 3. VENDA DE CAPACETE (balcão, sem moto)
-- ------------------------------------------------------------

create table if not exists public.helmet_sales (
  id               uuid primary key default gen_random_uuid(),
  data_venda       date not null,
  customer_id      uuid references public.customers(id) on delete set null,
  cliente_nome     text,
  cliente_cpf      text,
  cliente_telefone text,
  vendedor         text,
  forma_pagamento  text,
  parcelas         integer,
  valor_total      numeric(12,2) not null default 0,
  observacoes      text,
  criado_em        timestamptz not null default now()
);

alter table public.helmet_sales
  add column if not exists cliente_cpf text;

alter table public.helmet_sales
  add column if not exists cliente_telefone text;

/*
 * A primeira versão deste arquivo criava a coluna com o nome
 * "cliente". Se o banco já estiver assim, renomeia (mantendo
 * o conteúdo). Se não, garante que cliente_nome exista.
 */
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'helmet_sales'
       and column_name = 'cliente'
  ) and not exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'helmet_sales'
       and column_name = 'cliente_nome'
  ) then
    alter table public.helmet_sales
      rename column cliente to cliente_nome;

    raise notice 'helmet_sales.cliente renomeada para cliente_nome.';
  else
    alter table public.helmet_sales
      add column if not exists cliente_nome text;
  end if;
end;
$$;

create index if not exists helmet_sales_data
  on public.helmet_sales (data_venda desc);

create index if not exists helmet_sales_customer
  on public.helmet_sales (customer_id);

-- ------------------------------------------------------------
-- 4. CAPACETES VENDIDOS
--    sale_id        -> saiu junto com uma moto (tabela sales)
--    helmet_sale_id -> venda de capacete (tabela helmet_sales)
--    valor_unitario = 0  -> capacete dado de brinde
--    produto/marca/modelo/cor/tamanho ficam gravados aqui como
--    "foto" do momento da venda: o recibo e o histórico não
--    mudam se o catálogo for editado depois.
-- ------------------------------------------------------------

create table if not exists public.helmet_sale_items (
  id              uuid primary key default gen_random_uuid(),
  sale_id         uuid references public.sales(id)        on delete cascade,
  helmet_sale_id  uuid references public.helmet_sales(id) on delete cascade,
  helmet_model_id uuid not null references public.helmet_models(id) on delete restrict,
  data            date not null default current_date,
  produto         text not null default 'Capacete',
  marca           text,
  modelo          text,
  cor             text,
  tamanho         text,
  quantidade      integer       not null check (quantidade > 0),
  valor_unitario  numeric(12,2) not null default 0 check (valor_unitario >= 0),
  custo_unitario  numeric(12,2) not null default 0 check (custo_unitario >= 0),
  criado_em       timestamptz   not null default now(),
  constraint helmet_sale_items_origem check (
    (sale_id is not null and helmet_sale_id is null) or
    (sale_id is null     and helmet_sale_id is not null)
  )
);

alter table public.helmet_sale_items
  add column if not exists produto text not null default 'Capacete';

alter table public.helmet_sale_items
  add column if not exists marca text;

alter table public.helmet_sale_items
  add column if not exists modelo text;

alter table public.helmet_sale_items
  add column if not exists cor text;

alter table public.helmet_sale_items
  add column if not exists tamanho text;

create index if not exists helmet_sale_items_sale
  on public.helmet_sale_items (sale_id);

create index if not exists helmet_sale_items_helmet_sale
  on public.helmet_sale_items (helmet_sale_id);

create index if not exists helmet_sale_items_data
  on public.helmet_sale_items (data);

-- ------------------------------------------------------------
-- 5. ESTOQUE AUTOMÁTICO
-- ------------------------------------------------------------

-- Compra: entra no estoque e recalcula o custo médio ponderado.
create or replace function public.helmet_estoque_compra()
returns trigger
language plpgsql
as $$
declare
  estoque_anterior integer;
  custo_anterior   numeric(12,2);
  base             integer;
begin
  if (tg_op = 'INSERT') then
    select estoque_atual, custo_medio
      into estoque_anterior, custo_anterior
      from public.helmet_models
     where id = new.helmet_model_id
     for update;

    base := greatest(coalesce(estoque_anterior, 0), 0);

    update public.helmet_models
       set estoque_atual = coalesce(estoque_anterior, 0) + new.quantidade,
           custo_medio = case
             when base + new.quantidade = 0 then new.custo_unitario
             else round(
               ((base * coalesce(custo_anterior, 0)) +
                (new.quantidade * new.custo_unitario))
               / (base + new.quantidade)
             , 2)
           end
     where id = new.helmet_model_id;

    return new;
  end if;

  if (tg_op = 'UPDATE') then
    update public.helmet_models
       set estoque_atual = estoque_atual - old.quantidade
     where id = old.helmet_model_id;

    update public.helmet_models
       set estoque_atual = estoque_atual + new.quantidade
     where id = new.helmet_model_id;

    return new;
  end if;

  update public.helmet_models
     set estoque_atual = estoque_atual - old.quantidade
   where id = old.helmet_model_id;

  return old;
end;
$$;

drop trigger if exists trg_helmet_estoque_compra on public.helmet_purchase_items;

create trigger trg_helmet_estoque_compra
after insert or update or delete on public.helmet_purchase_items
for each row execute function public.helmet_estoque_compra();

-- Venda: completa custo e descrição do produto a partir do catálogo
-- quando o app não mandar (nunca depender disso, mas garante o dado).
create or replace function public.helmet_dados_venda()
returns trigger
language plpgsql
as $$
declare
  modelo_atual public.helmet_models%rowtype;
begin
  select *
    into modelo_atual
    from public.helmet_models
   where id = new.helmet_model_id;

  if (coalesce(new.custo_unitario, 0) = 0) then
    new.custo_unitario := coalesce(modelo_atual.custo_medio, 0);
  end if;

  new.produto := coalesce(
    nullif(new.produto, ''),
    modelo_atual.produto,
    'Capacete'
  );

  new.marca   := coalesce(nullif(new.marca, ''),   modelo_atual.marca);
  new.modelo  := coalesce(nullif(new.modelo, ''),  modelo_atual.modelo);
  new.cor     := coalesce(nullif(new.cor, ''),     modelo_atual.cor);
  new.tamanho := coalesce(nullif(new.tamanho, ''), modelo_atual.tamanho);

  return new;
end;
$$;

drop trigger if exists trg_helmet_custo_venda on public.helmet_sale_items;
drop trigger if exists trg_helmet_dados_venda on public.helmet_sale_items;

-- Função da primeira versão deste arquivo, substituída acima.
drop function if exists public.helmet_custo_venda();

create trigger trg_helmet_dados_venda
before insert on public.helmet_sale_items
for each row execute function public.helmet_dados_venda();

-- Venda: baixa do estoque (e devolve se a venda for apagada).
create or replace function public.helmet_estoque_venda()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    update public.helmet_models
       set estoque_atual = estoque_atual - new.quantidade
     where id = new.helmet_model_id;

    return new;
  end if;

  if (tg_op = 'UPDATE') then
    update public.helmet_models
       set estoque_atual = estoque_atual + old.quantidade
     where id = old.helmet_model_id;

    update public.helmet_models
       set estoque_atual = estoque_atual - new.quantidade
     where id = new.helmet_model_id;

    return new;
  end if;

  update public.helmet_models
     set estoque_atual = estoque_atual + old.quantidade
   where id = old.helmet_model_id;

  return old;
end;
$$;

drop trigger if exists trg_helmet_estoque_venda on public.helmet_sale_items;

create trigger trg_helmet_estoque_venda
after insert or update or delete on public.helmet_sale_items
for each row execute function public.helmet_estoque_venda();

-- ------------------------------------------------------------
-- 6. PERMISSÕES (usuário logado, igual ao resto do sistema)
-- ------------------------------------------------------------

alter table public.helmet_models         enable row level security;
alter table public.helmet_purchases      enable row level security;
alter table public.helmet_purchase_items enable row level security;
alter table public.helmet_sales          enable row level security;
alter table public.helmet_sale_items     enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'helmet_models',
    'helmet_purchases',
    'helmet_purchase_items',
    'helmet_sales',
    'helmet_sale_items'
  ]
  loop
    execute format(
      'drop policy if exists "acesso total %1$s" on public.%1$I',
      t
    );

    execute format(
      'create policy "acesso total %1$s" on public.%1$I
         for all to authenticated
         using (true) with check (true)',
      t
    );
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 7. CAIXA: liberar as origens do módulo de capacetes
--
-- Se cash_transactions.origem tiver um CHECK, ele é recriado
-- com TODOS os valores já usados hoje na tabela + os valores
-- conhecidos do sistema + os dois novos. Nenhum registro é
-- alterado ou apagado. Se não existir CHECK nenhum, nada é
-- criado (o sistema continua exatamente como está).
-- ------------------------------------------------------------

do $$
declare
  nome_constraint text;
  lista           text;
begin
  select conname
    into nome_constraint
    from pg_constraint
   where conrelid = 'public.cash_transactions'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%origem%'
   limit 1;

  if nome_constraint is null then
    raise notice
      'cash_transactions.origem nao possui CHECK. Nada a fazer.';
    return;
  end if;

  select string_agg(quote_literal(valor), ', ' order by valor)
    into lista
    from (
      select distinct origem as valor
        from public.cash_transactions
       where origem is not null
      union
      select unnest(array[
        'venda',
        'compra_moto',
        'gasto_moto',
        'despesa_loja',
        'venda_capacete',
        'compra_capacete',
        'outro'
      ])
    ) as valores;

  execute format(
    'alter table public.cash_transactions drop constraint %I',
    nome_constraint
  );

  execute format(
    'alter table public.cash_transactions
       add constraint %I check (origem in (%s))',
    nome_constraint,
    lista
  );

  raise notice
    'Constraint % recriada com: %', nome_constraint, lista;
end;
$$;

-- ------------------------------------------------------------
-- FIM
-- ------------------------------------------------------------
