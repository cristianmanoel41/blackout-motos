/*
 * REDUZ A FOTO DE UM DOCUMENTO ANTES DE MANDAR PARA LEITURA
 *
 * Foto de celular passa fácil de 5 MB, o máximo de imagem que
 * a leitura por IA aceita - e a leitura não precisa de tudo
 * isso: 2000px no lado maior lê o CRLV inteiro. Só a
 * cópia que vai para a leitura é reduzida; o arquivo guardado
 * na ficha continua o original.
 *
 * PDF e o que não for imagem passam como estão.
 */

const LADO_MAIOR = 2000;

export async function reduzirFotoParaLeitura(arquivo: File): Promise<Blob> {
  if (!arquivo.type.startsWith("image/")) return arquivo;

  try {
    const imagem = await createImageBitmap(arquivo);
    const escala = Math.min(
      1,
      LADO_MAIOR / Math.max(imagem.width, imagem.height)
    );

    const tela = document.createElement("canvas");
    tela.width = Math.round(imagem.width * escala);
    tela.height = Math.round(imagem.height * escala);
    tela.getContext("2d")?.drawImage(imagem, 0, 0, tela.width, tela.height);
    imagem.close();

    const reduzida = await new Promise<Blob | null>((resolver) =>
      tela.toBlob(resolver, "image/jpeg", 0.85)
    );

    return reduzida && reduzida.size < arquivo.size ? reduzida : arquivo;
  } catch {
    /* Formato que o navegador não abre: vai o original. */
    return arquivo;
  }
}
