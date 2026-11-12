-- Valor da transferencia do documento: de 690 para 790.
--
-- Pedido da loja em 12/11/2026. Muda so o valor que a tela de
-- venda ja traz preenchido nas vendas NOVAS. Venda antiga
-- guarda o proprio valor e nao muda.
--
-- Da para mudar de novo depois pela tela Configuracoes, sem
-- rodar SQL.

alter table public.configuracoes_loja
  alter column valor_transferencia set default 790;

update public.configuracoes_loja
   set valor_transferencia = 790,
       atualizado_em = now()
 where id = 1;

notify pgrst, 'reload schema';

-- Conferencia: deve mostrar 790.
select valor_transferencia from public.configuracoes_loja where id = 1;
