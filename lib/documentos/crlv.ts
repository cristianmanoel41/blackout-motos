/*
 * A CONFERÊNCIA DO CRLV
 *
 * O contrato da loja sai com placa, RENAVAM, chassi, marca,
 * modelo, anos e cor tirados do cadastro da moto. Um dígito
 * errado ali é contrato com moto que não existe. O CRLV é a
 * fonte certa desses dados - então, quando ele é anexado, o
 * sistema lê o documento e aponta o que não bate.
 *
 * Aqui ficam as duas partes que não dependem de servidor:
 *
 *   1. ler o texto do CRLV-e (o PDF digital do Detran/CDT);
 *   2. comparar o que foi lido com o cadastro.
 *
 * A leitura por IA, para foto ou documento escaneado, fica na
 * rota da API - ela precisa da chave, que não pode ir para o
 * navegador.
 */

export type DadosDoCrlv = {
  placa: string | null;
  renavam: string | null;
  chassi: string | null;
  marca: string | null;
  /* Modelo e versão, como o documento escreve depois da barra. */
  modelo: string | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  cor: string | null;
};

export type LeituraDoCrlv = {
  dados: DadosDoCrlv;
  /* "pdf": texto do CRLV-e, sem custo. "ia": leitura pela IA. */
  fonte: "pdf" | "ia";
};

export const CAMPOS_DO_CRLV: (keyof DadosDoCrlv)[] = [
  "placa",
  "renavam",
  "chassi",
  "marca",
  "modelo",
  "ano_fabricacao",
  "ano_modelo",
  "cor",
];

/* ---------------------------------------------------------- */
/* LEITURA DO CRLV-e                                           */
/* ---------------------------------------------------------- */

/*
 * Como o texto do CRLV-e sai.
 *
 * O PDF do CRLV-e põe primeiro TODOS os rótulos ("CÓDIGO
 * RENAVAM", "PLACA EXERCÍCIO", "ANO FABRICAÇÃO"...) e só
 * depois todos os valores, um bloco por linha. Rótulo e valor
 * não ficam lado a lado, então procurar "o que vem depois de
 * PLACA" não funciona.
 *
 * O que funciona é o formato de cada valor - e cada um tem o
 * seu: placa seguida do exercício ("FYQ9C76 2026"), os dois
 * anos juntos ("2022 2023"), chassi com 17 caracteres, marca e
 * modelo separados por barra ("HONDA/CG 160 FAN"), a cor no
 * começo da linha do combustível ("VERMELHA ALCOOL/GASOLINA").
 *
 * Os valores começam depois do texto fixo da Carteira Digital
 * ("Leia o QR Code e baixe agora."); quando a frase não está
 * lá, procura no texto inteiro.
 */

const CORES = [
  "AMARELA",
  "AMARELO",
  "AZUL",
  "BEGE",
  "BRANCA",
  "BRANCO",
  "CINZA",
  "DOURADA",
  "DOURADO",
  "FANTASIA",
  "GRENA",
  "LARANJA",
  "MARROM",
  "PRATA",
  "PRETA",
  "PRETO",
  "ROSA",
  "ROXA",
  "ROXO",
  "VERDE",
  "VERMELHA",
  "VERMELHO",
];

/*
 * Os combustíveis também levam barra ("ALCOOL/GASOLINA") e
 * não podem ser confundidos com marca/modelo.
 */
const COMBUSTIVEIS =
  /(ALCOOL|GASOLINA|DIESEL|FLEX|ELETRIC[OA]|GNV)/;

const VIN = /\b([A-HJ-NPR-Z0-9]{17})\b/;

export function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function lerTextoDoCrlv(texto: string): DadosDoCrlv {
  const marcador = texto.search(/Leia o QR Code/i);
  const trecho =
    marcador >= 0 ? texto.slice(marcador) : texto;

  const linhas = semAcento(trecho)
    .toUpperCase()
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);

  const dados: DadosDoCrlv = {
    placa: null,
    renavam: null,
    chassi: null,
    marca: null,
    modelo: null,
    ano_fabricacao: null,
    ano_modelo: null,
    cor: null,
  };

  for (const linha of linhas) {
    /*
     * O RENAVAM é o primeiro número sozinho na linha. O do CRV
     * vem depois e tem 12 dígitos; o RENAVAM tem 11 (os
     * antigos, 9, completados com zero na frente).
     */
    if (!dados.renavam && /^\d{9,11}$/.test(linha)) {
      dados.renavam = linha.padStart(11, "0");
      continue;
    }

    const placa = linha.match(
      /^([A-Z]{3})-?(\d[A-Z0-9]\d{2})\s+(19|20)\d{2}$/
    );

    if (!dados.placa && placa) {
      dados.placa = placa[1] + placa[2];
      continue;
    }

    const anos = linha.match(
      /^((?:19|20)\d{2})\s+((?:19|20)\d{2})$/
    );

    if (dados.ano_fabricacao === null && anos) {
      dados.ano_fabricacao = Number(anos[1]);
      dados.ano_modelo = Number(anos[2]);
      continue;
    }

    const marcaModelo = linha.match(
      /^(?:I\/)?([A-Z][A-Z .\-]*)\/([A-Z0-9].*)$/
    );

    if (
      !dados.marca &&
      marcaModelo &&
      !COMBUSTIVEIS.test(linha)
    ) {
      dados.marca = marcaModelo[1].trim();
      dados.modelo = marcaModelo[2].trim();
      continue;
    }

    if (!dados.chassi) {
      const vin = linha.match(VIN);

      if (vin) {
        dados.chassi = vin[1];
        continue;
      }
    }

    if (!dados.cor) {
      const primeira = linha.split(/\s+/)[0];

      if (CORES.includes(primeira)) {
        dados.cor = primeira;
      }
    }
  }

  return dados;
}

/* Leu tudo o que importa para o contrato? */
export function leituraCompleta(dados: DadosDoCrlv) {
  return CAMPOS_DO_CRLV.every(
    (campo) => dados[campo] !== null && dados[campo] !== ""
  );
}

/* ---------------------------------------------------------- */
/* COMPARAÇÃO COM O CADASTRO                                   */
/* ---------------------------------------------------------- */

export type MotoParaConferir = {
  placa: string | null;
  renavam: string | null;
  chassi: string | null;
  marca: string | null;
  modelo: string | null;
  versao: string | null;
  cor: string | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
};

/*
 * igual      bate com o documento
 * diferente  não bate - corrigir antes do contrato
 * atencao    pode estar certo, mas vale olhar (ex.: versão que
 *            o CRLV não escreve)
 * sem_dado   o documento ou o cadastro não tem o campo
 */
export type Situacao =
  | "igual"
  | "diferente"
  | "atencao"
  | "sem_dado";

export type ItemDaConferencia = {
  campo: string;
  nome: string;
  cadastro: string;
  documento: string;
  situacao: Situacao;
  nota?: string;
};

function so(valor: string | null | undefined) {
  return semAcento(String(valor ?? ""))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/*
 * Cor: o CRLV escreve no feminino ("VERMELHA"), o cadastro às
 * vezes no masculino ("Vermelho"). Os dois são a mesma cor.
 */
function corBase(valor: string | null | undefined) {
  return so(valor).replace(/[AO]$/, "");
}

function texto(valor: string | number | null | undefined) {
  return valor === null || valor === undefined || valor === ""
    ? "—"
    : String(valor);
}

export function conferirCrlv(
  moto: MotoParaConferir,
  doc: DadosDoCrlv
): ItemDaConferencia[] {
  const itens: ItemDaConferencia[] = [];

  function exato(
    campo: string,
    nome: string,
    cadastro: string | number | null,
    documento: string | number | null,
    igual: (a: string, b: string) => boolean = (a, b) =>
      so(a) === so(b)
  ) {
    const temCadastro =
      cadastro !== null && cadastro !== "";
    const temDocumento =
      documento !== null && documento !== "";

    itens.push({
      campo,
      nome,
      cadastro: texto(cadastro),
      documento: texto(documento),
      situacao:
        !temCadastro || !temDocumento
          ? "sem_dado"
          : igual(String(cadastro), String(documento))
          ? "igual"
          : "diferente",
      nota: !temCadastro && temDocumento
        ? "Falta no cadastro"
        : temCadastro && !temDocumento
        ? "Não foi possível ler no documento"
        : undefined,
    });
  }

  exato("placa", "Placa", moto.placa, doc.placa);

  exato(
    "renavam",
    "RENAVAM",
    moto.renavam,
    doc.renavam,
    (a, b) =>
      so(a).padStart(11, "0") === so(b).padStart(11, "0")
  );

  exato("chassi", "Chassi", moto.chassi, doc.chassi);
  exato("marca", "Marca", moto.marca, doc.marca);

  /*
   * Modelo: o CRLV junta modelo e versão depois da barra
   * ("CG 160 FAN"), e o cadastro separa. Bate se um contém o
   * outro, sem contar espaço e pontuação.
   */
  const modeloCadastro = so(moto.modelo);
  const modeloDoc = so(doc.modelo);

  exato(
    "modelo",
    "Modelo",
    moto.modelo,
    doc.modelo,
    () =>
      modeloDoc.includes(modeloCadastro) ||
      modeloCadastro.includes(modeloDoc)
  );

  /*
   * Versão: muitas vezes o CRLV simplesmente não escreve (a
   * "CBS" da CG, por exemplo). Não é erro, mas o contrato vai
   * imprimir - então vale um olhar.
   */
  if (moto.versao && modeloDoc) {
    const consta = modeloDoc.includes(so(moto.versao));

    itens.push({
      campo: "versao",
      nome: "Versão",
      cadastro: moto.versao,
      documento: texto(doc.modelo),
      situacao: consta ? "igual" : "atencao",
      nota: consta
        ? undefined
        : "A versão do cadastro não aparece no CRLV",
    });
  }

  exato(
    "ano_fabricacao",
    "Ano de fabricação",
    moto.ano_fabricacao,
    doc.ano_fabricacao
  );

  exato(
    "ano_modelo",
    "Ano do modelo",
    moto.ano_modelo,
    doc.ano_modelo
  );

  exato(
    "cor",
    "Cor",
    moto.cor,
    doc.cor,
    (a, b) => corBase(a) === corBase(b)
  );

  return itens;
}
