-- BLACKOUT MOTOS
-- Reforços de segurança (revisão de 13/11/2026).
--
-- Execute UMA VEZ no SQL Editor do Supabase. Pode rodar de
-- novo sem problema: cada parte desfaz a versão anterior antes.
--
-- 1. "Avise-me": quem sabe o telefone de um interessado não
--    consegue mais trocar o nome dele.
-- 2. Fotos: visitante só vê as fotos das motos à venda, e não
--    consegue mais listar o balde inteiro (motos vendidas,
--    arquivadas, placas).
-- 3. Perfil: cada um continua editando o próprio nome e e-mail,
--    mas não consegue mudar o próprio cargo (papel).
-- 4. Vendas de capacete sem cadastro: tabela trancada para quem
--    não está logado.


-- 1. CADASTRAR INTERESSE ---------------------------------------

create or replace function public.cadastrar_interesse(
  p_nome     text,
  p_telefone text,
  p_procura  text default null,
  p_origem   text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  numero text;
  limpo  text;
  moto   text;
begin
  numero := regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g');
  limpo  := btrim(coalesce(p_nome, ''));
  moto   := nullif(btrim(coalesce(p_procura, '')), '');

  -- Telefone brasileiro com DDD tem 10 ou 11 digitos.
  if length(numero) < 10 or length(numero) > 11 then
    raise exception 'telefone invalido';
  end if;

  if length(limpo) < 2 then
    raise exception 'nome invalido';
  end if;

  insert into public.interessados (nome, telefone, procura, origem)
  values (
    left(limpo, 80),
    numero,
    left(moto, 80),
    left(coalesce(p_origem, 'site'), 40)
  )
  on conflict (telefone) do update
    -- O nome NAO e mais trocado: quem soubesse o telefone de
    -- alguem podia renomear o interessado (13/11/2026).
    -- Quem se cadastrou sem dizer a moto nao apaga o que
    -- tinha dito antes.
    set procura = coalesce(excluded.procura, interessados.procura);

  return true;
end;
$$;

grant execute
  on function public.cadastrar_interesse(text, text, text, text)
  to anon, authenticated;


-- 2. FOTOS DAS MOTOS -------------------------------------------

-- Moto que esta a venda (a unica que o site e a vitrine mostram).
create or replace function public.moto_a_venda(p uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.motorcycles
    where id = p and status = 'disponivel'
  );
$$;

revoke execute on function public.moto_a_venda(uuid) from public;
grant execute on function public.moto_a_venda(uuid) to anon, authenticated;

drop policy if exists "leitura publica motorcycle_photos"
  on public.motorcycle_photos;

create policy "leitura publica motorcycle_photos"
  on public.motorcycle_photos
  for select to anon
  using (public.moto_a_venda(motorcycle_id));

-- O balde continua publico: o endereco de cada foto abre para
-- qualquer um, como o site precisa. O que sai e a LISTAGEM do
-- balde inteiro, que fica so para quem esta logado.
drop policy if exists "fotos-motos select" on storage.objects;

create policy "fotos-motos select" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos-motos');


-- 3. PERFIL: SEM TROCAR O PROPRIO CARGO ------------------------

revoke insert, update on public.profiles from authenticated;
grant insert (id, nome, email) on public.profiles to authenticated;
grant update (id, nome, email) on public.profiles to authenticated;


-- 4. VENDAS DE CAPACETE SEM CADASTRO ---------------------------

alter table public.helmet_unregistered_sales enable row level security;

revoke all on public.helmet_unregistered_sales from anon;

drop policy if exists "acesso autenticado helmet_unregistered_sales"
  on public.helmet_unregistered_sales;

create policy "acesso autenticado helmet_unregistered_sales"
  on public.helmet_unregistered_sales
  for all to authenticated
  using (true)
  with check (true);


notify pgrst, 'reload schema';
