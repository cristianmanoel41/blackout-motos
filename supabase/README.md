# Banco de dados

## Como aplicar uma migration

1. Abra o painel do Supabase do projeto.
2. Vá em **SQL Editor** → **New query**.
3. Cole o conteúdo do arquivo `.sql` inteiro e clique em **Run**.
4. Se aparecer erro de "schema cache" no sistema logo depois, rode:

```sql
NOTIFY pgrst, 'reload schema';
```

## Migrations

| Arquivo | O que faz |
| --- | --- |
| `migrations/0001_capacetes.sql` | Cria o módulo de capacetes: catálogo de modelos com valor padrão e estoque (`helmet_models`), notas fiscais de compra (`helmet_purchases` + `helmet_purchase_items`), vendas avulsas (`helmet_sales`) e capacetes vendidos (`helmet_sale_items`, ligados à venda da moto ou à venda avulsa). O estoque e o custo médio são atualizados por trigger. Nenhuma tabela existente é alterada. |

### Regras do módulo de capacetes

- **Estoque**: entra pela nota de compra, sai pela venda. Excluir a nota ou a venda devolve/retira as unidades automaticamente.
- **Custo médio**: recalculado a cada compra (média ponderada). É esse valor que é congelado em `helmet_sale_items.custo_unitario` na hora da venda, para o lucro não mudar depois.
- **Brinde**: capacete com `valor_unitario = 0`. Sai do estoque e entra como custo, sem receita.
- **Caixa**: a nota de compra lança saída com `origem = 'compra_capacete'` e a venda de balcão lança entrada com `origem = 'venda_capacete'`, sempre com `origem_id` apontando para o registro. Capacete vendido junto com a moto já está dentro do valor da venda da moto, então não gera lançamento separado. A seção 7 da migration amplia a constraint de `cash_transactions.origem` para aceitar essas duas origens.

## Recibo de capacete

- Modelo Word: `public/templates/recibo-capacete.docx`
- Gerado por: `node scripts/gerar-template-recibo.js` (dá para editar o .docx no Word depois; só não mexa nos campos entre chaves)
- Rota que preenche: `app/api/recibos/capacete/[id]/route.ts`
- Campos: `{cliente_nome} {cliente_cpf} {cliente_telefone} {produto} {marca} {modelo} {cor} {tamanho} {quantidade} {valor_unitario} {valor_total} {valor_extenso} {forma_pagamento} {vendedor} {data_extenso} {hora_documento}`
- A data e a hora impressas são as do momento da geração (fuso America/Sao_Paulo), não as da venda.

## Vistorias

- Arquivos ficam no bucket **privado** `vistorias` do Supabase Storage, em `motorcycle_id/tipo-timestamp-nome`.
- A tabela `motorcycle_inspections` guarda o registro (tipo, data, caminho, nome, tamanho, observação).
- `tipo` é `cautelar` ou `transferencia`. A de transferência guarda também o `sale_id` da venda em que foi anexada.
- O arquivo nunca tem URL pública: a tela gera um link assinado de 2 minutos na hora de abrir.
- Excluir a moto apaga os registros (cascade); o arquivo no Storage é removido pela tela ao excluir a vistoria.

## Autoria (quem cadastrou / quem alterou)

Toda tabela principal tem `created_by`, `updated_by` e `atualizado_em`, preenchidas por gatilho (`registrar_autoria`), não pelo sistema — vale para qualquer caminho que grave no banco.

- `created_by` nunca muda depois de criado, nem em UPDATE.
- Registro criado antes da migration `0004` fica sem autor; não há como descobrir quem criou.
- O nome exibido vem de `profiles.nome`. Todo usuário logado pode ler a lista de perfis (política criada na `0004`).
- O campo `vendedor` das vendas continua existindo e é o que os relatórios usam: ele vem preenchido com o usuário logado, mas pode ser trocado quando um registra a venda do outro.
