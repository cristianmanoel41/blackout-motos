import CardMoto from "@/components/v2/CardMoto";
import { type MotoSite } from "@/lib/dados/moto-site";

/*
 * O card da capa: as últimas motos passando sozinhas.
 *
 * Mesma mecânica da faixa de marcas, e sem JavaScript nenhum:
 * a fila é escrita duas vezes e a animação arrasta metade da
 * largura, então, quando ela termina, a segunda cópia está
 * exatamente onde a primeira começou e o salto de volta não
 * aparece.
 *
 * A diferença para a faixa de marcas é a largura de cada item:
 * aqui cada card ocupa a largura inteira da vitrine, então se
 * vê uma moto de cada vez, deslizando para dar lugar à
 * próxima - em vez de três lado a lado repetidas.
 *
 * Para quando o mouse encosta, para quem quiser ler com calma.
 * No celular não para: ali o dedo passa por cima o tempo todo
 * só para rolar a página.
 *
 * O card vai sem os dois botões: acertar "Ver detalhes" com o
 * dedo enquanto ele desliza é loteria. Aqui a foto, o nome e o
 * preço são o link inteiro - tocar em qualquer parte abre a
 * ficha, que é onde estão os botões.
 */

function Fila({
  motos,
  slugs,
  capas,
  escondida,
}: {
  motos: MotoSite[];
  slugs: Record<string, string>;
  capas: Record<string, string>;
  escondida?: boolean;
}) {
  return (
    <ul
      aria-hidden={escondida}
      inert={escondida}
      className="flex shrink-0 items-stretch"
    >
      {motos.map((moto, posicao) => (
        <li
          key={moto.id}
          className="w-[var(--card-capa)] shrink-0"
        >
          <CardMoto
            moto={moto}
            slug={slugs[moto.id]}
            foto={capas[moto.id]}
            prioridade={!escondida && posicao === 0}
            compacto
          />
        </li>
      ))}
    </ul>
  );
}

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
      <div className="esteira-capa">
        <Fila motos={motos} slugs={slugs} capas={capas} />

        {/* A cópia existe só para o laço não dar salto. */}
        <Fila
          motos={motos}
          slugs={slugs}
          capas={capas}
          escondida
        />
      </div>
    </div>
  );
}
