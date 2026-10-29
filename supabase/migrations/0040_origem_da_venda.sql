-- De onde veio o cliente de cada venda.
--
-- O site ja conta de onde vem quem abre moto e quem chama no
-- WhatsApp. Faltava a ponta que paga a conta: a venda. Com
-- esta coluna o painel mostra, lado a lado, visitas, conversas
-- e vendas por origem - e da para saber se o anuncio se paga.
--
-- Texto livre, preenchido por uma lista na tela de venda
-- (lib/dados/origem-venda.ts). Nulo nas vendas antigas e
-- quando ninguem perguntou.

alter table public.sales
  add column if not exists origem_cliente text;
