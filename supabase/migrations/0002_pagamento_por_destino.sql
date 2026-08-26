-- ============================================================
-- BLACKOUT MOTOS - PAGAMENTO SEPARADO POR MOTO / CAPACETE
-- ============================================================
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Ele só ADICIONA uma coluna. Nenhum registro é apagado e as
-- vendas antigas continuam válidas (viram "moto", que é o que
-- elas eram: antes do capacete existir, tudo pagava a moto).
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

alter table public.sale_payment_components
  add column if not exists destino text not null default 'moto';

/*
 * Só cria a restrição se ela ainda não existir, para o arquivo
 * poder ser rodado de novo sem erro.
 */
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.sale_payment_components'::regclass
       and conname = 'sale_payment_components_destino_check'
  ) then
    alter table public.sale_payment_components
      add constraint sale_payment_components_destino_check
      check (destino in ('moto', 'capacete'));
  end if;
end;
$$;

comment on column public.sale_payment_components.destino is
  'O que este pagamento está quitando: a moto ou os capacetes da venda.';

create index if not exists sale_payment_components_destino
  on public.sale_payment_components (destino);

-- ------------------------------------------------------------
-- FIM
-- ------------------------------------------------------------
