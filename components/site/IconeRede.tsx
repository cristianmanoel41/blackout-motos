/*
 * Os símbolos das redes sociais.
 *
 * Vão desenhados aqui porque o pacote de ícones do projeto não
 * traz mais marcas - ele removeu Instagram, Facebook e YouTube,
 * e nunca teve TikTok. Rede desconhecida devolve nulo, e o
 * rodapé mostra o nome sem quadrado vazio.
 */

type Props = { className?: string };

function Instagram({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Facebook({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.92 3.77-3.92 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.9h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94z" />
    </svg>
  );
}

function TikTok({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.18c.27 0 .52.04.76.12v-3.2a5.86 5.86 0 0 0-.76-.05 5.79 5.79 0 1 0 5.79 5.79V9.01a7.35 7.35 0 0 0 4.28 1.37V7.29a4.28 4.28 0 0 1-3.33-1.47z" />
    </svg>
  );
}

function YouTube({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M21.58 7.19a2.5 2.5 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42a2.5 2.5 0 0 0-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81a2.5 2.5 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.5 2.5 0 0 0 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM10 15.02V8.98L15.2 12 10 15.02z" />
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
