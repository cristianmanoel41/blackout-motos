import CardMoto from "@/components/v2/CardMoto";
import Carrossel from "@/components/v2/Carrossel";
import { type MotoSite } from "@/lib/dados/moto-site";

/*
 * A vitrine da capa: as últimas motos passando.
 *
 * ANTES ERA UMA ESTEIRA DE CSS, E O DEDO NÃO PEGAVA NELA.
 *
 * A fila era escrita duas vezes e uma animação arrastava metade
 * da largura, o que dava um laço perfeito sem JavaScript nenhum.
 * Bonito, e errado para quem está no celular: a animação é dona
 * da posição, então passar o dedo não muda nada. A pessoa via
 * uma moto que interessava, tentava segurar, e a moto ia embora
 * sozinha.
 *
 * Agora quem rola é o próprio navegador - a mesma escolha que o
 * carrossel do resto do site já tinha feito. A lista tem encaixe
 * (scroll-snap), então o dedo arrasta de verdade, com inércia, e
 * cada moto para no lugar certo. A troca automática continua,
 * só que agora ela manda rolar em vez de desenhar: para quando o
 * dedo encosta, quando o mouse está em cima e quando a aba sai
 * da frente.
 *
 * O QUE SE PERDEU, E POR QUE TUDO BEM
 *
 * O laço perfeito. Com a fila escrita uma vez só, chegar ao fim
 * e voltar ao começo é um pulo. Ele é seco de propósito
 * (`voltaSeca`): piscar lê-se como recomeço, enquanto voltar
 * rolando seria uma varrida longa para trás no alto da página.
 *
 * A fila dobrada não dava para manter: ali a cópia é escondida
 * dos leitores de tela e do teclado, o que no CSS não importava
 * porque ninguém alcançava - mas numa lista que rola o dedo
 * chega nela, e tocar numa moto que não abre nada é pior do que
 * o pulo.
 *
 * Os pontinhos embaixo vieram junto, e fazem falta aqui: sem
 * nenhum sinal, ninguém descobre que dá para arrastar.
 *
 * O card vai sem os dois botões: acertar "Ver detalhes" com o
 * dedo enquanto se arrasta é loteria. Aqui a foto, o nome e o
 * preço são o link inteiro - tocar em qualquer parte abre a
 * ficha, que é onde estão os botões.
 */

/* Cinco segundos por moto, o mesmo ritmo da esteira antiga. */
const TEMPO_POR_MOTO = 5000;

export default function CardRotativo({
  motos,
  slugs,
  capas,
}: {
  motos: MotoSite[];
  slugs: Record<string, string>;
  capas: Record<string, string>;
}) {
  if (motos.length === 0) return null;

  return (
    <div className="vitrine-capa">
      <Carrossel
        rotulo="Últimas entradas"
        tempo={TEMPO_POR_MOTO}
        voltaSeca
      >
        {motos.map((moto, posicao) => (
          <div
            key={moto.id}
            className="w-[var(--card-capa)] min-w-0"
          >
            <CardMoto
              moto={moto}
              slug={slugs[moto.id]}
              foto={capas[moto.id]}
              prioridade={posicao === 0}
              compacto
            />
          </div>
        ))}
      </Carrossel>
    </div>
  );
}
