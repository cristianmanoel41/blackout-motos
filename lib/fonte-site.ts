import { Anton, Archivo, Inter } from "next/font/google";

/*
 * A letra do site: duas fontes, cada uma no seu trabalho.
 *
 * Fonte única fazendo tudo é o que dá ao site aquele ar de
 * modelo pronto. Loja de verdade separa: uma família firme e
 * larga para o que grita - nome da moto, preço, manchete - e
 * outra sóbria e legível para o que se lê com calma.
 *
 * ARCHIVO nos títulos: desenhada para cartaz e placa, tem
 * peso sem ficar pesada e não se desmancha em caixa alta, que
 * é como o site escreve os títulos.
 *
 * INTER no texto: feita para tela, com letras que não se
 * confundem entre si no tamanho pequeno. É o que a pessoa lê
 * na rua, no meio do sol, decidindo comprar moto.
 *
 * As duas vêm servidas pelo próprio site, não pelo Google:
 * uma ida a menos a servidor de fora e nada de texto piscando
 * ao carregar. Só os pesos que o site usa - cada peso a mais
 * é arquivo a mais para o celular do cliente baixar.
 */

export const fonteTitulo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--fonte-titulo",
});

export const fonteSite = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--fonte-site",
});

/*
 * A letra de cartaz, do que grita na capa.
 *
 * Estreita e pesada, de placa de oficina: cabe mais palavra
 * na linha e dá presença ao nome da moto sem precisar de
 * corpo gigante. Tem um peso só - é assim que ela foi
 * desenhada.
 */
export const fonteCartaz = Anton({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--fonte-cartaz",
});
