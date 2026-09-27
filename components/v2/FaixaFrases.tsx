/*
 * A faixa de frases.
 *
 * Mesma mecânica da faixa de marcas: a lista é escrita duas
 * vezes e a animação arrasta metade da largura, então o laço
 * fecha sem salto e sem JavaScript.
 *
 * Só entra frase que a loja cumpre. Faixa que anda é lida de
 * relance, e promessa lida de relance é cobrada no balcão.
 */

const FRASES = [
  "Perícia cautelar antes de comprar",
  "Revisão feita na loja",
  "Transferência conduzida pela loja",
  "Compramos sua moto com pagamento no PIX",
  "Financiamento com aprovação rápida",
  "Aceitamos sua moto na troca",
];

function Lista({ escondida }: { escondida?: boolean }) {
  return (
    <ul
      aria-hidden={escondida}
      className="flex shrink-0 items-center"
    >
      {FRASES.map((frase) => (
        <li
          key={frase}
          className="flex items-center gap-8 px-8"
        >
          <span className="whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.18em] claro">
            {frase}
          </span>

          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rotate-45 bg-[#e0b129]"
          />
        </li>
      ))}
    </ul>
  );
}

export default function FaixaFrases() {
  return (
    <section
      aria-label="O que a loja faz em toda moto"
      className="overflow-hidden border-y border-[#e0b129]/20 bg-gradient-to-r from-[#0c0c10] via-[#16130c] to-[#0c0c10] py-4"
    >
      <div className="esteira-frases">
        <Lista />
        {/* A cópia existe só para o laço não dar salto. */}
        <Lista escondida />
      </div>
    </section>
  );
}
