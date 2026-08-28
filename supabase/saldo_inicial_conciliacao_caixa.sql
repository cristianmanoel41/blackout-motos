-- BLACKOUT MOTOS
-- Saldo inicial, corte financeiro e conciliação de caixa.
--
-- Execute TODO este bloco UMA VEZ no SQL Editor do Supabase.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.cash_control_settings (
  id text PRIMARY KEY,
  data_inicio date NOT NULL,
  inicio_em timestamptz NOT NULL DEFAULT now(),
  saldo_banco_inicial numeric(12,2) NOT NULL DEFAULT 0,
  saldo_dinheiro_inicial numeric(12,2) NOT NULL DEFAULT 0,
  saldo_outros_inicial numeric(12,2) NOT NULL DEFAULT 0,
  saldo_inicial numeric(12,2) NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cash_control_settings_id_check
    CHECK (id = 'principal'),

  CONSTRAINT cash_control_settings_saldos_check
    CHECK (
      saldo_banco_inicial >= 0
      AND saldo_dinheiro_inicial >= 0
      AND saldo_outros_inicial >= 0
      AND saldo_inicial >= 0
    )
);

CREATE TABLE IF NOT EXISTS public.cash_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_conciliacao timestamptz NOT NULL DEFAULT now(),
  saldo_banco numeric(12,2) NOT NULL DEFAULT 0,
  saldo_dinheiro numeric(12,2) NOT NULL DEFAULT 0,
  saldo_outros numeric(12,2) NOT NULL DEFAULT 0,
  saldo_real numeric(12,2) NOT NULL DEFAULT 0,
  saldo_sistema numeric(12,2) NOT NULL DEFAULT 0,
  diferenca numeric(12,2) NOT NULL DEFAULT 0,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cash_reconciliations_saldos_check
    CHECK (
      saldo_banco >= 0
      AND saldo_dinheiro >= 0
      AND saldo_outros >= 0
      AND saldo_real >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_cash_reconciliations_data
  ON public.cash_reconciliations (data_conciliacao DESC);

ALTER TABLE public.cash_control_settings
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cash_reconciliations
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_control_settings_select_authenticated"
ON public.cash_control_settings;

DROP POLICY IF EXISTS "cash_control_settings_insert_authenticated"
ON public.cash_control_settings;

DROP POLICY IF EXISTS "cash_control_settings_update_authenticated"
ON public.cash_control_settings;

DROP POLICY IF EXISTS "cash_control_settings_delete_authenticated"
ON public.cash_control_settings;

CREATE POLICY "cash_control_settings_select_authenticated"
ON public.cash_control_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "cash_control_settings_insert_authenticated"
ON public.cash_control_settings
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "cash_control_settings_update_authenticated"
ON public.cash_control_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "cash_control_settings_delete_authenticated"
ON public.cash_control_settings
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "cash_reconciliations_select_authenticated"
ON public.cash_reconciliations;

DROP POLICY IF EXISTS "cash_reconciliations_insert_authenticated"
ON public.cash_reconciliations;

DROP POLICY IF EXISTS "cash_reconciliations_update_authenticated"
ON public.cash_reconciliations;

DROP POLICY IF EXISTS "cash_reconciliations_delete_authenticated"
ON public.cash_reconciliations;

CREATE POLICY "cash_reconciliations_select_authenticated"
ON public.cash_reconciliations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "cash_reconciliations_insert_authenticated"
ON public.cash_reconciliations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "cash_reconciliations_update_authenticated"
ON public.cash_reconciliations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "cash_reconciliations_delete_authenticated"
ON public.cash_reconciliations
FOR DELETE
TO authenticated
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.cash_control_settings
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.cash_reconciliations
TO authenticated;

NOTIFY pgrst, 'reload schema';
