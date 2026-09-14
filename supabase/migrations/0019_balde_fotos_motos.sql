-- ============================================================
-- BLACKOUT MOTOS - Balde das fotos da moto
-- ============================================================
--
-- A migracao 0017 tentava criar o balde, mas antes dele vinha
-- um indice sobre a coluna "capa" - que nao existia naquela
-- tabela. O erro abortou o script e o balde ficou pelo
-- caminho, dando "Bucket not found" ao subir foto.
--
-- Aqui so o balde e as permissoes dele.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================


-- ------------------------------------------------------------
-- 1. O BALDE
--
-- Publico de proposito: foto de moto e feita para ser vista -
-- vai para a vitrine, para o WhatsApp do cliente e, mais
-- adiante, para a rede social. Documento de cliente e outra
-- coisa e continua no balde privado.
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('fotos-motos', 'fotos-motos', true)
on conflict (id) do update set public = true;


-- ------------------------------------------------------------
-- 2. PERMISSÕES
--
-- Ver e livre; subir, trocar e apagar so quem esta logado.
-- ------------------------------------------------------------

do $$
declare
  acao text;
begin
  foreach acao in array array['select','insert','update','delete']
  loop
    execute format(
      'drop policy if exists "fotos-motos %1$s" on storage.objects',
      acao
    );
  end loop;

  execute $politica$
    create policy "fotos-motos select" on storage.objects
      for select to public
      using (bucket_id = 'fotos-motos')
  $politica$;

  execute $politica$
    create policy "fotos-motos insert" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'fotos-motos')
  $politica$;

  execute $politica$
    create policy "fotos-motos update" on storage.objects
      for update to authenticated
      using (bucket_id = 'fotos-motos')
      with check (bucket_id = 'fotos-motos')
  $politica$;

  execute $politica$
    create policy "fotos-motos delete" on storage.objects
      for delete to authenticated
      using (bucket_id = 'fotos-motos')
  $politica$;
end;
$$;


-- ------------------------------------------------------------
-- 3. CONFERÊNCIA
--
-- Tem que voltar uma linha, com publico = true e 4 politicas.
-- ------------------------------------------------------------

select
  b.id            as balde,
  b.public        as publico,
  (select count(*) from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'fotos-motos %') as politicas
from storage.buckets b
where b.id = 'fotos-motos';
