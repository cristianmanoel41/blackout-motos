/*
 * QUANDO A MOTO ESTÁ NO NOME DE OUTRA PESSOA
 *
 * Quem vende para a loja nem sempre é quem está no documento:
 * o genro vende a moto que está no nome da sogra. O contrato
 * de compra continua com quem vendeu - é quem negocia e recebe
 * -, mas a procuração para transferir só vale assinada por quem
 * está no CRLV.
 *
 * Por isso a moto guarda, além do vendedor (fornecedor_*), o
 * proprietário do documento (proprietario_*). Vazio quando os
 * dois são a mesma pessoa - o caso comum -, e aí tudo sai do
 * vendedor, como sempre saiu.
 *
 * Sem "use client": a procuração e o contrato, no servidor,
 * usam as mesmas contas.
 */

export const CAMPOS_DO_PROPRIETARIO = [
  "proprietario_nome",
  "proprietario_cpf",
  "proprietario_rg",
  "proprietario_cep",
  "proprietario_rua",
  "proprietario_numero",
  "proprietario_complemento",
  "proprietario_bairro",
  "proprietario_cidade",
  "proprietario_estado",
] as const;

export type CampoDoProprietario =
  (typeof CAMPOS_DO_PROPRIETARIO)[number];

export type DadosDoProprietario = Record<CampoDoProprietario, string>;

export function proprietarioVazio(): DadosDoProprietario {
  return Object.fromEntries(
    CAMPOS_DO_PROPRIETARIO.map((campo) => [campo, ""])
  ) as DadosDoProprietario;
}

/* Lê da ficha, onde os campos podem vir nulos ou nem existir
   (banco sem a migração 0041). */
export function proprietarioDaMoto(
  moto: Record<string, unknown>
): DadosDoProprietario {
  return Object.fromEntries(
    CAMPOS_DO_PROPRIETARIO.map((campo) => [
      campo,
      String(moto[campo] ?? ""),
    ])
  ) as DadosDoProprietario;
}

export function temOutroProprietario(
  moto: Record<string, unknown>
) {
  return Boolean(String(moto.proprietario_nome ?? "").trim());
}

/* O que vai para o banco. Desligado, tudo nulo: a moto volta a
   ser do vendedor. */
export function colunasDoProprietario(
  dados: DadosDoProprietario,
  ligado: boolean
) {
  return Object.fromEntries(
    CAMPOS_DO_PROPRIETARIO.map((campo) => {
      let valor = ligado ? String(dados[campo] || "").trim() : "";

      if (campo === "proprietario_estado") valor = valor.toUpperCase();

      return [campo, valor || null];
    })
  ) as Record<CampoDoProprietario, string | null>;
}

/*
 * Quem assina a procuração: o proprietário do documento quando
 * a moto está no nome de outra pessoa, senão quem vendeu.
 */
export function outorganteDaMoto(moto: Record<string, unknown>) {
  const doDono = temOutroProprietario(moto);
  const prefixo = doDono ? "proprietario_" : "fornecedor_";
  const campo = (nome: string) => moto[`${prefixo}${nome}`];

  return {
    doDono,
    nome: campo("nome"),
    cpf: campo("cpf"),
    rg: campo("rg"),
    rua: campo("rua"),
    numero: campo("numero"),
    complemento: campo("complemento"),
    bairro: campo("bairro"),
    cidade: campo("cidade"),
    estado: campo("estado"),
    cep: campo("cep"),
  };
}
