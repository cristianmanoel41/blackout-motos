-- ============================================================
-- BLACKOUT MOTOS - Conferência do CRLV com o cadastro
-- ============================================================
--
-- Quando o CRLV é anexado na ficha da moto, o sistema lê o
-- documento (placa, RENAVAM, chassi, marca/modelo, anos e
-- cor) e compara com o cadastro, para que o contrato não saia
-- com dado errado.
--
-- A leitura fica guardada no próprio anexo: o documento não
-- muda, então lê-lo de novo a cada vez que a ficha abre seria
-- trabalho (e, na leitura por IA, custo) jogado fora. A
-- comparação, ao contrário, é refeita na tela - assim, depois
-- de corrigir o cadastro, a conferência já aparece certa.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

alter table public.motorcycle_inspections
  add column if not exists leitura jsonb;

alter table public.motorcycle_inspections
  add column if not exists lido_em timestamptz;
