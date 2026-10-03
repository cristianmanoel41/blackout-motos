-- ============================================================
-- BLACKOUT MOTOS - Apagar visitas do site
-- ============================================================
--
-- Rode no SQL Editor do Supabase, uma parte de cada vez.
--
-- IMPORTANTE, para nao apagar mais do que precisa: a medicao so
-- conta quem entra por blackoutmotos.com.br. Teste feito no
-- localhost, no 192.168.15.11 ou no blackout-motos-amber.
-- vercel.app NUNCA foi contado. Entao o que esta guardado veio
-- do dominio de verdade - pode ser voce pelo celular, pode ser
-- cliente.
--
-- Por isso: olhe primeiro (parte 1), escolha a hora de corte, e
-- so entao apague (parte 2).
-- ============================================================


-- ------------------------------------------------------------
-- PARTE 1 - OLHAR. Nao apaga nada.
-- ------------------------------------------------------------

-- 1a) Quantas visitas por dia, nos ultimos 7 dias.
select
  (criado_em at time zone 'America/Sao_Paulo')::date as dia,
  count(*) filter (where tipo = 'pagina')   as telas,
  count(*) filter (where tipo = 'whatsapp') as whatsapp,
  count(*)                                   as total
from public.visitas_site
where criado_em >= now() - interval '7 days'
group by 1
order by 1 desc;


-- 1b) Hora a hora, so de hoje. E aqui que da para ver onde
--     comecou a sequencia de acessos seguidos.
select
  to_char(criado_em at time zone 'America/Sao_Paulo', 'HH24:00') as hora,
  count(*) as visitas,
  count(distinct caminho) as telas_diferentes
from public.visitas_site
where (criado_em at time zone 'America/Sao_Paulo')::date
      = (now() at time zone 'America/Sao_Paulo')::date
group by 1
order by 1;


-- ------------------------------------------------------------
-- PARTE 2 - APAGAR. Escolha UMA das tres.
-- ------------------------------------------------------------

-- 2a) Apagar tudo de HOJE.
--     E a escolha certa se o dia inteiro foi teste seu.
delete from public.visitas_site
 where (criado_em at time zone 'America/Sao_Paulo')::date
       = (now() at time zone 'America/Sao_Paulo')::date;


-- 2b) Apagar a partir de uma HORA que voce escolher.
--     Troque a data e a hora pela que a parte 1b mostrou.
--     O horario e o de Sao Jose dos Campos.
--
-- delete from public.visitas_site
--  where criado_em >= timestamp '2026-10-02 20:00'
--                     at time zone 'America/Sao_Paulo';


-- 2c) Apagar TUDO e comecar a contagem do zero.
--
-- delete from public.visitas_site;


-- ------------------------------------------------------------
-- PARTE 3 - CONFERIR o que sobrou.
-- ------------------------------------------------------------

select
  count(*) as visitas_que_sobraram,
  min(criado_em at time zone 'America/Sao_Paulo') as mais_antiga,
  max(criado_em at time zone 'America/Sao_Paulo') as mais_recente
from public.visitas_site;
