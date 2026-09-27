/*
 * A faixa de marcas.
 *
 * Anda sozinha e sem JavaScript: a lista é escrita duas vezes
 * lado a lado e a animação arrasta metade da largura, então
 * quando ela termina a segunda cópia está exatamente onde a
 * primeira começou. Ninguém vê o salto de volta.
 *
 * Sem logotipo: usar a marca dos fabricantes exigiria o
 * arquivo oficial de cada um e permissão de uso. Nome escrito
 * na letra do site diz a mesma coisa e não promete parceria
 * que a loja não tem.
 */

const MARCAS = [
  "Honda",
  "Yamaha",
  "Kawasaki",
  "Suzuki",
  "BMW",
  "Triumph",
  "Dafra",
  "Royal Enfield",
  "Shineray",
  "Haojue",
];

function Lista({ escondida }: { escondida?: boolean }) {
  return (
    <ul
      aria-hidden={escondida}
      className="flex shrink-0 items-center"
    >
      {MARCAS.map((marca) => (
        <li
          key={marca}
          className="flex items-center gap-10 px-10"
        >
          <span className="titulo whitespace-nowrap text-[1.1rem] text-white/70 sm:text-[1.3rem]">
            {marca}
          </span>

          <span
            aria-hidden="true"
            className="h-5 w-px bg-white/10"
          />
        </li>
      ))}
    </ul>
  );
}

export default function FaixaMarcas() {
  return (
    <section
      aria-label="Marcas que a loja trabalha"
      className="overflow-hidden border-b border-white/[.07] bg-[#0c0c10] py-5"
    >
      <div className="esteira">
        <Lista />
        {/* A cópia existe só para o laço não dar salto. */}
        <Lista escondida />
      </div>
    </section>
  );
}
