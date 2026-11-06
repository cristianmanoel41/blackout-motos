-- Quando a moto esta no nome de outra pessoa.
--
-- O genro vende para a loja a moto que esta no nome da sogra.
-- O contrato de compra continua com quem vendeu (fornecedor_*),
-- e a procuracao sai no nome de quem esta no documento
-- (proprietario_*). Tudo nulo quando o vendedor e o proprio
-- dono - o caso comum, que continua igual.
--
-- Ver lib/dados/proprietario.ts.

alter table public.motorcycles
  add column if not exists proprietario_nome text,
  add column if not exists proprietario_cpf text,
  add column if not exists proprietario_rg text,
  add column if not exists proprietario_cep text,
  add column if not exists proprietario_rua text,
  add column if not exists proprietario_numero text,
  add column if not exists proprietario_complemento text,
  add column if not exists proprietario_bairro text,
  add column if not exists proprietario_cidade text,
  add column if not exists proprietario_estado text;
