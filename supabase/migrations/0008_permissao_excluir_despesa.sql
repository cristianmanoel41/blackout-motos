-- ============================================================
-- BLACKOUT MOTOS - Permissão para excluir despesa e lançamento
-- ============================================================
--
-- Quando a tabela tem RLS ligada e não existe política de
-- DELETE, o banco não devolve erro: ele só não apaga nada. A
-- tela pede confirmação, some o aviso e a despesa continua ali,
-- sem explicação nenhuma.
--
-- Este arquivo cria a política de exclusão só onde ela não
-- existe. Se a sua já existe, nada é criado e nada é alterado.
--
-- Rode no SQL Editor do Supabase.
-- ============================================================


-- ------------------------------------------------------------
-- 1. DIAGNÓSTICO
--
-- Mostra o que existe hoje. Roda antes de mudar qualquer coisa,
-- e o resultado aparece na aba de resultados.
-- ------------------------------------------------------------

select
  tablename  as tabela,
  policyname as politica,
  cmd        as comando,
  roles      as papeis
from pg_policies
where schemaname = 'public'
  and tablename in (
    'store_expenses',
    'cash_transactions',
    'motorcycle_expenses'
  )
order by tablename, cmd;


-- ------------------------------------------------------------
-- 2. POLÍTICAS DE EXCLUSÃO
--
-- Só cria onde não há nenhuma política que já cubra o DELETE
-- (uma política FOR ALL também cobre).
-- ------------------------------------------------------------

do $$
declare
  alvo text;
begin
  foreach alvo in array array[
    'store_expenses',
    'cash_transactions',
    'motorcycle_expenses'
  ]
  loop
    -- Tabela que não existe neste banco é ignorada.
    if to_regclass('public.' || alvo) is null then
      raise notice 'Tabela % nao existe. Pulando.', alvo;
      continue;
    end if;

    if exists (
      select 1
        from pg_policies
       where schemaname = 'public'
         and tablename = alvo
         and cmd in ('DELETE', 'ALL')
    ) then
      raise notice
        'Tabela % ja permite exclusao. Nada a fazer.', alvo;
      continue;
    end if;

    execute format(
      'create policy %I on public.%I
         for delete to authenticated
         using (true)',
      alvo || '_delete_autenticado',
      alvo
    );

    raise notice 'Politica de exclusao criada em %.', alvo;
  end loop;
end $$;


-- ------------------------------------------------------------
-- 3. CACHE DO POSTGREST
-- ------------------------------------------------------------

notify pgrst, 'reload schema';
