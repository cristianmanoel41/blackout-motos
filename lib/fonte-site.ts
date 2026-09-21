import { Plus_Jakarta_Sans } from "next/font/google";

/*
 * A letra do site.
 *
 * O painel interno continua na fonte do sistema - lá o que
 * importa é ler número e tabela. No site é diferente: a letra
 * é metade da impressão que a loja passa, e a do sistema
 * operacional deixa tudo com cara de documento.
 *
 * Plus Jakarta Sans é geométrica, de traço grosso no peso
 * alto, e é o mais perto que se acha em fonte aberta do que
 * as lojas grandes usam. Vem servida pelo próprio site, não
 * pelo Google: uma ida a menos a servidor de fora, e nada de
 * texto piscando ao carregar.
 *
 * Os pesos são só os que o site usa. Cada peso a mais é
 * arquivo a mais para o celular do cliente baixar.
 */

export const fonteSite = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--fonte-site",
});
