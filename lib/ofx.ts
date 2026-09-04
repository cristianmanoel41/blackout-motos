/*
 * Leitor de extrato OFX.
 *
 * O OFX que o Itaú Empresas entrega é SGML: as etiquetas abrem
 * e quase nunca fecham, e o arquivo costuma vir em latin1. Não
 * dá para usar um parser de XML - daí a leitura na mão, que é
 * simples porque só interessam data, valor, tipo e histórico.
 */

export type LancamentoOfx = {
  /* AAAA-MM-DD */
  data: string;
  valor: number;
  tipo: "entrada" | "saida";
  descricao: string;
  /* Identificador do banco, para não importar duas vezes. */
  id: string;
};

/*
 * <DTPOSTED>20260903120000[-3:BRT] -> 2026-09-03
 *
 * A hora e o fuso do arquivo são ignorados de propósito: o
 * banco marca a data do lançamento, e é por ela que a loja
 * procura.
 */
function dataDoOfx(bruto: string) {
  const digitos = bruto.replace(/\D/g, "").slice(0, 8);

  if (digitos.length !== 8) return "";

  return `${digitos.slice(0, 4)}-${digitos.slice(
    4,
    6
  )}-${digitos.slice(6, 8)}`;
}

function valorDoOfx(bruto: string) {
  /* Vem como -1234.56, e às vezes com vírgula. */
  const limpo = bruto.trim().replace(",", ".");
  const numero = Number(limpo);

  return Number.isFinite(numero) ? numero : 0;
}

function campo(bloco: string, etiqueta: string) {
  const re = new RegExp(
    `<${etiqueta}>([^<\\r\\n]*)`,
    "i"
  );

  const achado = bloco.match(re);

  return achado ? achado[1].trim() : "";
}

export function lerOfx(conteudo: string): LancamentoOfx[] {
  const lancamentos: LancamentoOfx[] = [];

  /* Cada movimentação vem dentro de um <STMTTRN>. */
  const blocos = conteudo.split(/<STMTTRN>/i).slice(1);

  for (const parte of blocos) {
    const bloco = parte.split(/<\/STMTTRN>/i)[0];

    const data = dataDoOfx(campo(bloco, "DTPOSTED"));
    if (!data) continue;

    const valor = valorDoOfx(campo(bloco, "TRNAMT"));
    if (!valor) continue;

    /*
     * MEMO é o histórico que aparece no extrato. NAME vem
     * preenchido em alguns bancos; um dos dois serve.
     */
    const descricao =
      campo(bloco, "MEMO") ||
      campo(bloco, "NAME") ||
      "Lançamento do banco";

    lancamentos.push({
      data,
      valor: Math.abs(valor),
      tipo: valor >= 0 ? "entrada" : "saida",
      descricao,
      id:
        campo(bloco, "FITID") ||
        `${data}-${valor}-${descricao}`,
    });
  }

  return lancamentos.sort((a, b) =>
    a.data.localeCompare(b.data)
  );
}

/*
 * O arquivo do Itaú costuma vir em latin1. Lido como UTF-8,
 * "TRANSFERÊNCIA" chega quebrado - então tenta UTF-8 e, se
 * aparecer o caractere de erro, relê como latin1.
 */
export async function lerArquivoOfx(arquivo: File) {
  const bytes = await arquivo.arrayBuffer();

  const comoUtf8 = new TextDecoder("utf-8").decode(bytes);

  if (!comoUtf8.includes("�")) return comoUtf8;

  return new TextDecoder("windows-1252").decode(bytes);
}

/*
 * Duas datas são "o mesmo dia" para o banco e para a loja com
 * alguma folga: um PIX lançado à noite pode cair no dia
 * seguinte no extrato.
 */
export function diasDeDiferenca(a: string, b: string) {
  const umDia = 1000 * 60 * 60 * 24;

  const tempoA = new Date(`${a}T00:00:00`).getTime();
  const tempoB = new Date(`${b}T00:00:00`).getTime();

  if (!Number.isFinite(tempoA) || !Number.isFinite(tempoB)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(tempoA - tempoB) / umDia;
}
