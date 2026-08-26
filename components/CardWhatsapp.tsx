/*
 * Card e botão de WhatsApp.
 *
 * Abre o wa.me numa aba nova, direto na conversa do cliente,
 * sem precisar salvar o contato no celular.
 *
 * Funciona em servidor e cliente: é só um link.
 */

const DDI_BRASIL = "55";

/*
 * Deixa o telefone no formato que o WhatsApp espera:
 * 55 + DDD + número, só dígitos.
 *
 * Devolve null quando o número não dá para usar.
 */
export function telefoneParaWhatsapp(
  telefone: string | null | undefined
): string | null {
  const digitos = String(telefone || "").replace(/\D/g, "");

  if (!digitos) return null;

  /* Já veio com o código do país. */
  if (
    digitos.startsWith(DDI_BRASIL) &&
    (digitos.length === 12 || digitos.length === 13)
  ) {
    return digitos;
  }

  /* DDD + 8 dígitos (fixo/antigo) ou DDD + 9 dígitos. */
  if (digitos.length === 10 || digitos.length === 11) {
    return `${DDI_BRASIL}${digitos}`;
  }

  return null;
}

export function linkWhatsapp(
  telefone: string | null | undefined,
  mensagem?: string
): string | null {
  const numero = telefoneParaWhatsapp(telefone);

  if (!numero) return null;

  const texto = mensagem?.trim()
    ? `?text=${encodeURIComponent(mensagem.trim())}`
    : "";

  return `https://wa.me/${numero}${texto}`;
}

function IconeWhatsapp({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

/*
 * Card grande, para a ficha do cliente.
 */
export default function CardWhatsapp({
  telefone,
  nome,
  mensagem,
}: {
  telefone: string | null | undefined;
  nome?: string | null;
  mensagem?: string;
}) {
  const primeiroNome =
    String(nome || "").trim().split(/\s+/)[0] || "";

  const textoPadrao = primeiroNome
    ? `Olá, ${primeiroNome}! Aqui é da Blackout Motos.`
    : "Olá! Aqui é da Blackout Motos.";

  const link = linkWhatsapp(
    telefone,
    mensagem ?? textoPadrao
  );

  if (!link) {
    return (
      <div className="rounded-2xl border border-grafite-claro bg-grafite p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-grafite-claro text-texto-suave">
            <IconeWhatsapp />
          </div>

          <div>
            <p className="font-semibold text-texto">
              WhatsApp
            </p>

            <p className="text-sm text-texto-suave">
              {telefone
                ? "Telefone incompleto. Corrija para abrir a conversa."
                : "Cliente sem telefone cadastrado."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-green-800 bg-green-950/20 p-5 transition hover:border-green-500 hover:bg-green-950/40"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-white transition group-hover:bg-green-500">
          <IconeWhatsapp />
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-green-300">
            Chamar no WhatsApp
          </p>

          <p className="truncate text-sm text-texto-suave">
            {telefone} · abre a conversa numa aba nova
          </p>
        </div>
      </div>
    </a>
  );
}

/*
 * Botão pequeno, para listas e tabelas.
 */
export function BotaoWhatsapp({
  telefone,
  nome,
  mensagem,
  rotulo = "WhatsApp",
}: {
  telefone: string | null | undefined;
  nome?: string | null;
  mensagem?: string;
  rotulo?: string;
}) {
  const primeiroNome =
    String(nome || "").trim().split(/\s+/)[0] || "";

  const textoPadrao = primeiroNome
    ? `Olá, ${primeiroNome}! Aqui é da Blackout Motos.`
    : "Olá! Aqui é da Blackout Motos.";

  const link = linkWhatsapp(
    telefone,
    mensagem ?? textoPadrao
  );

  if (!link) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-green-800 bg-green-950/30 px-3 py-2 text-xs font-semibold text-green-300 transition hover:border-green-500 hover:bg-green-900/40"
    >
      <IconeWhatsapp size={15} />
      {rotulo}
    </a>
  );
}
