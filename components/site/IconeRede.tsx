/*
 * Os símbolos das redes sociais, nas cores de cada marca.
 *
 * Vão desenhados aqui porque o pacote de ícones do projeto não
 * traz marcas - ele removeu Instagram, Facebook e YouTube, e
 * nunca teve TikTok.
 *
 * Cada um traz a sua cor: o degradê do Instagram, o azul do
 * Facebook, o ciano e o rosa do TikTok, o vermelho do YouTube.
 * É a cor que faz a pessoa reconhecer a rede antes de ler
 * qualquer coisa - em dourado, os quatro viravam o mesmo
 * borrão.
 *
 * Rede desconhecida devolve nulo, e o rodapé mostra o nome sem
 * quadrado vazio.
 */

type Props = { className?: string };

function Instagram({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient
          id="degrade-instagram"
          x1="0%"
          y1="100%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#FFDD55" />
          <stop offset="25%" stopColor="#FF543E" />
          <stop offset="55%" stopColor="#C837AB" />
          <stop offset="100%" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>

      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5.6"
        fill="url(#degrade-instagram)"
      />

      <circle
        cx="12"
        cy="12"
        r="4.3"
        fill="none"
        stroke="#fff"
        strokeWidth="1.9"
      />

      <circle cx="17.4" cy="6.6" r="1.25" fill="#fff" />
    </svg>
  );
}

function Facebook({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path
        fill="#fff"
        d="M15.4 15.1l.44-2.9h-2.78v-1.88c0-.79.39-1.57 1.63-1.57h1.27V6.29S14.81 6.1 13.7 6.1c-2.32 0-3.83 1.4-3.83 3.94v2.16H7.32v2.9h2.55v7.01a10.1 10.1 0 0 0 3.19 0v-7.01h2.34z"
      />
    </svg>
  );
}

function TikTok({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
    >
      {/* As sombras ciano e rosa são a assinatura da marca. */}
      <path
        fill="#25F4EE"
        d="M15.3 4.6a4.6 4.6 0 0 0 1.03 2.66 4.6 4.6 0 0 1-2.1-1.28v7.7a5.15 5.15 0 1 1-5.15-5.15c.22 0 .43.02.64.05v2.6a2.57 2.57 0 1 0 1.8 2.45V2.8h2.65c0 .23.02.46.06.68z"
        transform="translate(-1.25 0)"
      />

      <path
        fill="#FE2C55"
        d="M15.3 4.6a4.6 4.6 0 0 0 1.03 2.66 4.6 4.6 0 0 1-2.1-1.28v7.7a5.15 5.15 0 1 1-5.15-5.15c.22 0 .43.02.64.05v2.6a2.57 2.57 0 1 0 1.8 2.45V2.8h2.65c0 .23.02.46.06.68z"
        transform="translate(1.25 0)"
      />

      <path
        fill="#fff"
        d="M15.3 4.6a4.6 4.6 0 0 0 1.03 2.66 4.63 4.63 0 0 0 2.62.81v2.62a7.2 7.2 0 0 1-3.65-1.03v4.66a5.15 5.15 0 1 1-5.15-5.15c.22 0 .43.02.64.05v2.6a2.57 2.57 0 1 0 1.8 2.45V2.8h2.65c0 .23.02.46.06.68z"
      />
    </svg>
  );
}

function YouTube({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="#FF0000"
        d="M21.58 7.19a2.5 2.5 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42a2.5 2.5 0 0 0-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81a2.5 2.5 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.5 2.5 0 0 0 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81z"
      />
      <path fill="#fff" d="M10 15.02V8.98L15.2 12 10 15.02z" />
    </svg>
  );
}

const ICONES: Record<
  string,
  (props: Props) => React.ReactElement
> = {
  Instagram,
  Facebook,
  TikTok,
  YouTube,
};

export function IconeRede({
  nome,
  className = "h-5 w-5",
}: {
  nome: string;
  className?: string;
}) {
  const Icone = ICONES[nome];

  if (!Icone) return null;

  return <Icone className={className} />;
}
