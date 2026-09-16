/*
 * A faixa de marcas.
 *
 * Só o nome, em texto: logotipo de fabricante é marca
 * registrada de terceiro, e usar sem autorização numa página
 * comercial é briga que a loja não precisa comprar. O nome
 * escrito informa a mesma coisa e não depende de arquivo que
 * pode faltar e quebrar o build.
 */

const MARCAS = [
  "Honda",
  "Yamaha",
  "Kawasaki",
  "Suzuki",
  "BMW",
  "Dafra",
];

export default function Marcas() {
  return (
    <section className="border-b border-white/[.07] bg-[#08080a] py-9">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-5 px-4 sm:gap-x-16">
        {MARCAS.map((marca) => (
          <span
            key={marca}
            className="text-lg font-black uppercase tracking-wider text-white/35 transition hover:text-white/70 sm:text-xl"
          >
            {marca}
          </span>
        ))}
      </div>
    </section>
  );
}
