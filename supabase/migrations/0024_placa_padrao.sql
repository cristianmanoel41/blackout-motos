-- ============================================================
-- BLACKOUT MOTOS - Placa sempre no mesmo formato
-- ============================================================
--
-- A partir de agora o cadastro guarda a placa com hífen entre
-- as três letras e os quatro últimos caracteres: CUI-3G48.
-- Serve para o padrão antigo (ABC-1234) e para o Mercosul
-- (ABC-1D23), que têm o mesmo tamanho.
--
-- Este arquivo acerta as motos que já estão cadastradas, para
-- as antigas aparecerem igual às novas nos contratos, na
-- vitrine e no estoque.
--
-- Só mexe em placa com exatamente 7 caracteres. Se alguma
-- estiver incompleta ou com lixo digitado, fica como está e
-- aparece na conferência do fim.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================

update public.motorcycles
   set placa =
         upper(
           substring(
             regexp_replace(placa, '[^A-Za-z0-9]', '', 'g')
             from 1 for 3
           )
         )
         || '-'
         || upper(
              substring(
                regexp_replace(placa, '[^A-Za-z0-9]', '', 'g')
                from 4 for 4
              )
            )
 where placa is not null
   and length(
         regexp_replace(placa, '[^A-Za-z0-9]', '', 'g')
       ) = 7
   and placa is distinct from
         upper(
           substring(
             regexp_replace(placa, '[^A-Za-z0-9]', '', 'g')
             from 1 for 3
           )
         )
         || '-'
         || upper(
              substring(
                regexp_replace(placa, '[^A-Za-z0-9]', '', 'g')
                from 4 for 4
              )
            );

notify pgrst, 'reload schema';

-- Conferência: placas que NÃO estão no padrão CUI-3G48.
-- O ideal é esta consulta voltar vazia.
select codigo, marca, modelo, placa
  from public.motorcycles
 where placa is not null
   and placa !~ '^[A-Z0-9]{3}-[A-Z0-9]{4}$'
 order by codigo;
