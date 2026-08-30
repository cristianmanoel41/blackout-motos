-- ============================================================
-- BLACKOUT MOTOS - Baixa dos lançamentos do caixa
-- ============================================================
--
-- Hoje todo lançamento entra no caixa no mesmo instante em que
-- o cadastro é salvo. Só que o dinheiro nem sempre anda junto:
-- a peça encomendada só é paga quando chega e é montada, o
-- banco deposita o financiamento dias depois da venda, a moto
-- comprada às vezes é acertada na semana seguinte.
--
-- Aqui o lançamento passa a ter dois momentos: ele é criado
-- (previsto) e depois recebe baixa (confirmado). O saldo do
-- caixa conta só o que foi confirmado - assim ele volta a bater
-- com o dinheiro que existe de verdade.
--
-- NADA do que já está lançado muda: a coluna nasce com padrão
-- "confirmado", então todo histórico continua exatamente onde
-- está e com o mesmo saldo.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- ============================================================


-- ------------------------------------------------------------
-- 1. COLUNAS
-- ------------------------------------------------------------

-- confirmado: o dinheiro entrou ou saiu de verdade.
alter table public.cash_transactions
  add column if not exists confirmado boolean not null default true;

-- data_confirmacao: o dia em que o pagamento aconteceu, que
-- pode ser diferente do dia do lançamento.
alter table public.cash_transactions
  add column if not exists data_confirmacao date;


-- ------------------------------------------------------------
-- 2. HISTÓRICO
--
-- Tudo que já existia estava valendo como dinheiro movimentado,
-- então continua confirmado, com a confirmação na própria data
-- do lançamento.
-- ------------------------------------------------------------

update public.cash_transactions
   set data_confirmacao = data
 where confirmado is true
   and data_confirmacao is null;


-- ------------------------------------------------------------
-- 3. ÍNDICE
--
-- A tela de caixa separa pendente de confirmado a cada carga.
-- ------------------------------------------------------------

create index if not exists cash_transactions_confirmado_idx
  on public.cash_transactions (confirmado);


-- ------------------------------------------------------------
-- 4. CACHE DO POSTGREST
--
-- Sem isto o sistema reclama que a coluna "confirmado" não
-- existe, mesmo ela existindo.
-- ------------------------------------------------------------

notify pgrst, 'reload schema';
