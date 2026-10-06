import { PDFDocument } from "pdf-lib";

/*
 * Junta as páginas escaneadas num PDF só.
 *
 * O contrato tem mais de uma folha, e a loja escaneia pelo
 * celular - o que chega aqui depende do caminho que a pessoa
 * tomou:
 *
 *   - Scanner do iPhone (Notas ou Arquivos): já vem um PDF
 *     endireitado e em preto e branco, às vezes com todas as
 *     folhas, às vezes em dois arquivos.
 *   - Câmera: vêm várias fotos soltas, uma por folha.
 *
 * Os dois caminhos entram aqui e saem iguais: um arquivo. Quatro
 * imagens soltas no WhatsApp do cliente é pior que o papel - ele
 * não sabe a ordem, perde uma, e não tem como imprimir junto.
 */

/* O que o navegador manda e nós aceitamos. */
const IMAGENS = ["image/jpeg", "image/jpg", "image/png"];

export const TIPOS_ACEITOS = [...IMAGENS, "application/pdf"];

/*
 * A4 em pontos (72 por polegada), que é a unidade do PDF.
 *
 * Toda foto entra numa folha A4 em pé, do tamanho da folha, em
 * vez de virar uma página do tamanho da foto. Assim o contrato
 * sai com todas as folhas iguais - e imprime sem a impressora
 * ter que adivinhar escala.
 */
const A4 = { largura: 595.28, altura: 841.89 };

export type PaginaRecebida = {
  nome: string;
  tipo: string;
  bytes: Uint8Array;
};

export async function juntarPaginas(
  recebidas: PaginaRecebida[]
) {
  if (recebidas.length === 0) {
    throw new Error("Nenhuma página recebida.");
  }

  const documento = await PDFDocument.create();

  documento.setTitle("Contrato assinado");
  documento.setProducer("Blackout Motos");
  documento.setCreationDate(new Date());

  for (const pagina of recebidas) {
    if (pagina.tipo === "application/pdf") {
      /*
       * PDF que já veio pronto: entram todas as páginas dele,
       * na ordem, sem redesenhar nada. O scanner do iPhone já
       * fez o trabalho melhor do que nós faríamos.
       */
      const origem = await PDFDocument.load(pagina.bytes, {
        ignoreEncryption: true,
      });

      const copiadas = await documento.copyPages(
        origem,
        origem.getPageIndices()
      );

      for (const folha of copiadas) documento.addPage(folha);

      continue;
    }

    if (!IMAGENS.includes(pagina.tipo)) {
      throw new Error(
        `"${pagina.nome}" não é foto nem PDF.`
      );
    }

    const imagem =
      pagina.tipo === "image/png"
        ? await documento.embedPng(pagina.bytes)
        : await documento.embedJpg(pagina.bytes);

    const folha = documento.addPage([A4.largura, A4.altura]);

    /*
     * A foto cabe inteira na folha, sem cortar e sem esticar.
     *
     * Cortar para preencher decepa a margem do papel - e é
     * justamente na margem que ficam a assinatura e o carimbo.
     * O que sobra fica branco, como sobra numa fotocópia.
     */
    const escala = Math.min(
      A4.largura / imagem.width,
      A4.altura / imagem.height
    );

    const largura = imagem.width * escala;
    const altura = imagem.height * escala;

    folha.drawImage(imagem, {
      x: (A4.largura - largura) / 2,
      y: (A4.altura - altura) / 2,
      width: largura,
      height: altura,
    });
  }

  const bytes = await documento.save();

  return {
    bytes,
    paginas: documento.getPageCount(),
  };
}
