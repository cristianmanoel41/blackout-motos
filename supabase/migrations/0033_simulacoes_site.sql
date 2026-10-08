-- ============================================================
-- BLACKOUT MOTOS - Quantos clientes simulam pagamento no site
-- ============================================================
--
-- O simulador de /financiamento faz a conta inteira no celular
-- do cliente e nao deixava rastro: a loja sabia quanta gente
-- abriu a tela, mas nao quanta gente chegou a ver uma parcela.
--
-- Agora cada simulacao vira uma linha na mesma tabela das
-- visitas, com tipo proprio:
--
--   'simulacao_financiamento' = viu a parcela no banco
--   'simulacao_cartao'        = viu a parcela na maquininha
--
-- Conta quando a parcela aparece na tela - metodo escolhido e
-- valor preenchido -, e nao quando a pessoa so encosta no botao.
-- O site conta uma vez por metodo em cada aba aberta: quem
-- arrasta a barra da entrada vinte vezes e um cliente, nao
-- vinte.
--
-- Igual as visitas: sem cookie, sem IP, sem saber quem e.
--
-- As contas que ja existem (visitas, telas, fichas, WhatsApp,
-- origem, dia, hora) filtram pelo tipo, entao estas linhas novas
-- nao mexem em nenhum numero de hoje.
--
-- Depende da 0029. Rode este arquivo inteiro no SQL Editor do
-- Supabase. Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

-- ------------------------------------------------------------
-- 1. O REGISTRO PASSA A ACEITAR OS DOIS TIPOS NOVOS
--
--    Mesma funcao da 0029, so com a lista de tipos maior. O
--    resto - cortar tamanho, ignorar moto apagada, devolver so
--    "true" - continua como estava.
-- ------------------------------------------------------------

create or replace function public.registrar_visita(
  p_caminho     text,
  p_tipo        text default 'pagina',
  p_moto        uuid default null,
  p_origem      text default null,
  p_referencia  text default null,
  p_campanha    text default null,
  p_dispositivo text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  endereco text;
  qual     uuid;
begin
  endereco := btrim(coalesce(p_caminho, ''));

  if endereco = '' then
    return false;
  end if;

  if coalesce(p_tipo, '') not in (
    'pagina',
    'whatsapp',
    'simulacao_financiamento',
    'simulacao_cartao'
  ) then
    return false;
  end if;

  select m.id into qual
    from public.motorcycles m
   where m.id = p_moto;

  insert into public.visitas_site (
    tipo, caminho, moto_id, origem,
    referencia, campanha, dispositivo
  )
  values (
    p_tipo,
    left(endereco, 200),
    qual,
    left(nullif(btrim(coalesce(p_origem, '')), ''), 40),
    left(nullif(btrim(coalesce(p_referencia, '')), ''), 200),
    left(nullif(btrim(coalesce(p_campanha, '')), ''), 80),
    left(nullif(btrim(coalesce(p_dispositivo, '')), ''), 20)
  );

  return true;
end;
$$;

grant execute on function public.registrar_visita(
  text, text, uuid, text, text, text, text
) to anon, authenticated;

-- ------------------------------------------------------------
-- 2. O RESUMO DAS SIMULACOES
--
--    Mesma janela das visitas (1 = hoje, 7 = esta semana), no
--    horario daqui.
-- ------------------------------------------------------------

create or replace function public.simulacoes_resumo(p_dias int default 7)
returns table (
  financiamento bigint,
  cartao        bigint
)
language sql
stable
as $$
  select
    count(*) filter (where tipo = 'simulacao_financiamento'),
    count(*) filter (where tipo = 'simulacao_cartao')
  from public.visitas_site
  where criado_em >= public.visitas_inicio(p_dias);
$$;

-- So o sistema le. Mesmo motivo da 0029, secao 10.
revoke execute on function public.simulacoes_resumo(int) from public, anon;
grant  execute on function public.simulacoes_resumo(int) to authenticated;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Conferencia: quantas simulacoes ja estao guardadas.
-- ------------------------------------------------------------

select * from public.simulacoes_resumo(30);
