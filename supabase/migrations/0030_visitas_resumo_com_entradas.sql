-- ============================================================
-- BLACKOUT MOTOS - O painel passa a contar GENTE, nao so tela
-- ============================================================
--
-- O resumo contava tela aberta, ficha de moto e clique no
-- WhatsApp - e faltava justamente o numero que a loja pergunta
-- primeiro: quantas PESSOAS entraram no site hoje.
--
-- Tela aberta nao responde isso. Quem entra e olha seis motos
-- abre sete telas sozinho, e o numero parece movimento que nao
-- houve.
--
-- A conta de visita ja estava guardada sem a gente perceber: a
-- coluna `origem` so e preenchida na PRIMEIRA tela de cada
-- visita - e por isso que andar pelo site nao conta chegada
-- nova. Entao contar as linhas que tem origem e contar visita,
-- exato, sem precisar de cookie nem de id de visitante.
--
-- O que conta como uma visita: a pessoa abriu o site vindo de
-- fora (Instagram, Google, link, digitando o endereco). Se ela
-- voltar horas depois, e outra visita - que e como qualquer
-- medicao de site trata, e como a loja pensa.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

-- A funcao ganha coluna nova, e o Postgres nao deixa trocar o
-- formato do retorno por cima: tem que sair e entrar de novo.
drop function if exists public.visitas_resumo(int);

create function public.visitas_resumo(p_dias int default 7)
returns table (
  visitas  bigint,
  telas    bigint,
  fichas   bigint,
  whatsapp bigint
)
language sql
stable
as $$
  select
    count(*) filter (
      where tipo = 'pagina' and origem is not null
    ),
    count(*) filter (where tipo = 'pagina'),
    count(*) filter (where tipo = 'pagina' and moto_id is not null),
    count(*) filter (where tipo = 'whatsapp')
  from public.visitas_site
  where criado_em >= public.visitas_inicio(p_dias);
$$;

revoke execute on function public.visitas_resumo(int) from public, anon;
grant  execute on function public.visitas_resumo(int) to authenticated;

-- ------------------------------------------------------------
-- O movimento dia a dia tambem passa a separar gente de tela.
--
-- O grafico mostrava tela aberta por dia, e tela aberta nao e
-- pergunta que alguem faz: a loja quer ver quanta GENTE entrou
-- em cada dia. A tela continua vindo junto, e aparece ao passar
-- o mouse.
--
-- Serve tambem para comparar semana com semana - com o numero
-- de cada dia na mao, a conta se faz na tela, sem voltar aqui.
-- ------------------------------------------------------------

drop function if exists public.visitas_por_dia(int);

create function public.visitas_por_dia(p_dias int default 30)
returns table (
  dia      date,
  pessoas  bigint,
  telas    bigint,
  whatsapp bigint
)
language sql
stable
as $$
  with janela as (
    select generate_series(
      date_trunc('day', (now() at time zone 'America/Sao_Paulo'))
        - make_interval(days => greatest(coalesce(p_dias, 30), 1) - 1),
      date_trunc('day', (now() at time zone 'America/Sao_Paulo')),
      interval '1 day'
    ) as inicio
  )
  select
    janela.inicio::date,
    count(v.id) filter (
      where v.tipo = 'pagina' and v.origem is not null
    ),
    count(v.id) filter (where v.tipo = 'pagina'),
    count(v.id) filter (where v.tipo = 'whatsapp')
  from janela
  left join public.visitas_site v
    on (v.criado_em at time zone 'America/Sao_Paulo') >= janela.inicio
   and (v.criado_em at time zone 'America/Sao_Paulo') <  janela.inicio + interval '1 day'
  group by janela.inicio
  order by janela.inicio;
$$;

revoke execute on function public.visitas_por_dia(int) from public, anon;
grant  execute on function public.visitas_por_dia(int) to authenticated;

-- ------------------------------------------------------------
-- E o grafico por hora passa a contar GENTE CHEGANDO.
--
-- Contava tela aberta, e tela aberta espalha a pessoa por
-- varias horas: quem entra as 14h50 e fica meia hora aparece
-- nas 14 e nas 15. A pergunta que a loja faz e outra - a que
-- horas as pessoas CHEGAM -, porque e a resposta que diz quando
-- alguem precisa estar no WhatsApp para responder na hora.
-- ------------------------------------------------------------

drop function if exists public.visitas_por_hora(int);

create function public.visitas_por_hora(p_dias int default 30)
returns table (
  hora    int,
  visitas bigint
)
language sql
stable
as $$
  select
    h.hora::int,
    count(v.id)
  from generate_series(0, 23) as h(hora)
  left join public.visitas_site v
    on extract(hour from (v.criado_em at time zone 'America/Sao_Paulo')) = h.hora
   and v.criado_em >= public.visitas_inicio(p_dias)
   and v.tipo = 'pagina'
   and v.origem is not null
  group by h.hora
  order by h.hora;
$$;

revoke execute on function public.visitas_por_hora(int) from public, anon;
grant  execute on function public.visitas_por_hora(int) to authenticated;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Conferencia: visitas, telas, fichas e WhatsApp de hoje.
-- ------------------------------------------------------------

select * from public.visitas_resumo(1);
