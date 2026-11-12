-- Data da 1a parcela do financiamento.
--
-- Pedido da loja em 12/11/2026: na tela de venda, quando e
-- financiamento, anotar o vencimento da primeira parcela no
-- banco - e essa data sai escrita no contrato de venda.
--
-- Coluna nova e opcional: venda antiga fica com ela vazia e o
-- contrato simplesmente nao fala da data.

alter table public.sales
  add column if not exists data_primeira_parcela date;

notify pgrst, 'reload schema';
