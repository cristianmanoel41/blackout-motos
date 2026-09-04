-- ============================================================
-- BLACKOUT MOTOS - Aceitar "moto de outra loja"
-- ============================================================
--
-- A tela ja oferece "Moto de outra loja", mas o banco ainda
-- recusa: a regra de tipo_entrada foi criada antes desse tipo
-- existir. Salvar a ficha dava
--
--   violates check constraint "motorcycles_tipo_entrada_check"
--
-- e sem conseguir marcar, a moto de outra loja continuava
-- disputando o destaque do painel como se fosse da casa.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================


-- ------------------------------------------------------------
-- 1. O QUE A REGRA ACEITA HOJE
--
-- Guarde o resultado: e o retrato de antes da mudanca.
-- ------------------------------------------------------------

select
  conname   as regra,
  pg_get_constraintdef(oid) as definicao
from pg_constraint
where conrelid = 'public.motorcycles'::regclass
  and conname like '%tipo_entrada%';


-- ------------------------------------------------------------
-- 2. QUE TIPOS EXISTEM GRAVADOS
--
-- Se aparecer algum tipo fora da lista abaixo, PARE e me
-- avise: a nova regra recusaria essas linhas.
-- ------------------------------------------------------------

select
  coalesce(tipo_entrada, '(vazio)') as tipo,
  count(*) as motos
from public.motorcycles
group by 1
order by 2 desc;


-- ------------------------------------------------------------
-- 3. REGRA NOVA
--
-- Os quatro tipos que a tela de cadastro oferece, mais o nulo
-- das motos cadastradas antes desse campo existir.
-- ------------------------------------------------------------

alter table public.motorcycles
  drop constraint if exists motorcycles_tipo_entrada_check;

alter table public.motorcycles
  add constraint motorcycles_tipo_entrada_check
  check (
    tipo_entrada is null
    or tipo_entrada in (
      'compra_nova',
      'estoque_inicial',
      'troca',
      'outra_loja'
    )
  );


notify pgrst, 'reload schema';


-- ------------------------------------------------------------
-- 4. CONFERENCIA
--
-- Deve listar a regra ja com 'outra_loja' dentro.
-- ------------------------------------------------------------

select pg_get_constraintdef(oid) as regra_nova
from pg_constraint
where conrelid = 'public.motorcycles'::regclass
  and conname = 'motorcycles_tipo_entrada_check';
