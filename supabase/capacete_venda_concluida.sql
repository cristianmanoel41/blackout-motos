-- BLACKOUT MOTOS
-- Capacete vinculado a uma venda de moto já concluída.
--
-- Pode ser executado mesmo que você ainda NÃO tenha criado
-- a tabela helmet_unregistered_sales anteriormente.
--
-- Execute todo este bloco no SQL Editor do Supabase.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.helmet_unregistered_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_venda date NOT NULL,
  valor_recebido numeric(12,2) NOT NULL,
  forma_pagamento text NOT NULL,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT helmet_unregistered_sales_valor_check
    CHECK (valor_recebido > 0),

  CONSTRAINT helmet_unregistered_sales_pagamento_check
    CHECK (
      forma_pagamento IN (
        'Pix',
        'Dinheiro',
        'Transferência',
        'Cartão',
        'Outro'
      )
    )
);

ALTER TABLE public.helmet_unregistered_sales
  ADD COLUMN IF NOT EXISTS sale_id uuid
    REFERENCES public.sales(id)
    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ja_incluido_na_venda boolean
    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS caixa_lancado boolean
    NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_helmet_unregistered_sales_data
  ON public.helmet_unregistered_sales (data_venda DESC);

CREATE INDEX IF NOT EXISTS idx_helmet_unregistered_sales_sale_id
  ON public.helmet_unregistered_sales (sale_id);

NOTIFY pgrst, 'reload schema';
