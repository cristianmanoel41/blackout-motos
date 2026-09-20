/*
 * Os símbolos do Google Maps e do Waze.
 *
 * Desenhados aqui porque o pacote de ícones do projeto não traz
 * marcas. São representações simples - o alfinete do Maps e o
 * balão do Waze -, o suficiente para a pessoa reconhecer o
 * aplicativo de relance sem copiar o logotipo deles.
 *
 * Ficam nas cores das marcas de propósito: num botão escuro,
 * é a cor que faz o reconhecimento antes mesmo da leitura.
 */

type Props = { className?: string };

export function IconeGoogleMaps({
  className = "h-4 w-4",
}: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="#EA4335"
        d="M12 2a7.5 7.5 0 0 0-7.5 7.5c0 5.25 7.5 12.5 7.5 12.5s7.5-7.25 7.5-12.5A7.5 7.5 0 0 0 12 2z"
      />
      <circle cx="12" cy="9.5" r="2.9" fill="#fff" />
    </svg>
  );
}

export function IconeWaze({
  className = "h-4 w-4",
}: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="#33CCFF"
        d="M12 2.5c4.9 0 8.9 3.4 8.9 7.9 0 1.5-.4 2.9-1.2 4.1a6 6 0 0 1-8.3 5.2 6 6 0 0 1-5-3.6C4 14.6 3.1 12.6 3.1 10.4 3.1 5.9 7.1 2.5 12 2.5z"
      />
      <circle cx="9.4" cy="9.2" r="1.15" fill="#0b0b0d" />
      <circle cx="14.6" cy="9.2" r="1.15" fill="#0b0b0d" />
      <path
        d="M9 12.6c.7 1 1.8 1.6 3 1.6s2.3-.6 3-1.6"
        fill="none"
        stroke="#0b0b0d"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
