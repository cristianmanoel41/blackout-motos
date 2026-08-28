-- BLACKOUT MOTOS
-- Controle temporário de vendas de capacetes antigos
-- sem cadastro de estoque e sem custo conhecido.
--
-- Execute UMA VEZ no SQL Editor do Supabase.

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

CREATE INDEX IF NOT EXISTS idx_helmet_unregistered_sales_data
  ON public.helmet_unregistered_sales (data_venda DESC);

NOTIFY pgrst, 'reload schema';
