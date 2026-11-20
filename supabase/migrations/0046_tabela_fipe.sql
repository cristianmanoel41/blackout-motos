-- BLACKOUT MOTOS
-- Tabela FIPE de cada moto (pedido de 20/11/2026).
--
-- Execute UMA VEZ no SQL Editor do Supabase. Pode rodar de
-- novo sem problema: "add column if not exists" não refaz o
-- que já existe.
--
-- Guarda o código da FIPE que a equipe escolheu pra cada moto
-- (marca, modelo e ano da FIPE, que quase nunca batem com o
-- nome exato cadastrado aqui) e o valor mais recente. O valor
-- só é um cache - some novo em toda consulta no SQL Editor:
-- 10% acima dele é o teto que o Santander libera sem pedir
-- entrada do cliente.

alter table public.motorcycles
  add column if not exists fipe_marca_codigo   text,
  add column if not exists fipe_modelo_codigo  text,
  add column if not exists fipe_modelo_nome    text,
  add column if not exists fipe_ano_codigo     text,
  add column if not exists fipe_valor          numeric,
  add column if not exists fipe_mes_referencia text,
  add column if not exists fipe_atualizado_em  timestamptz;
