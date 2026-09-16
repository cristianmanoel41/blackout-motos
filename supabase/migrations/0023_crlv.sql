-- ============================================================
-- BLACKOUT MOTOS - CRLV junto das vistorias
-- ============================================================
--
-- O CRLV e o documento do veiculo, nao uma vistoria, mas vive
-- no mesmo lugar: e o papel que a loja procura junto com a
-- cautelar quando vai transferir a moto. Guardar os tres na
-- mesma tela poupa procurar em dois cantos.
--
-- Por isso ele entra como mais um tipo em motorcycle_inspections
-- em vez de ganhar tabela propria: mesmo bucket, mesma politica,
-- mesma listagem.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

do $$
declare
  nome_constraint text;
begin
  select conname
    into nome_constraint
    from pg_constraint
   where conrelid = 'public.motorcycle_inspections'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%tipo%';

  if nome_constraint is not null then
    execute format(
      'alter table public.motorcycle_inspections drop constraint %I',
      nome_constraint
    );
  end if;

  alter table public.motorcycle_inspections
    add constraint motorcycle_inspections_tipo_check
    check (tipo in ('cautelar', 'transferencia', 'crlv'));

  raise notice 'Tipo crlv liberado.';
end $$;

notify pgrst, 'reload schema';

-- Conferência: o que já está guardado, por tipo.
select tipo, count(*) as arquivos
  from public.motorcycle_inspections
 group by tipo
 order by tipo;
