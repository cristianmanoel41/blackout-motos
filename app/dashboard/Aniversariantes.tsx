import Link from "next/link";
import { Cake, MessageCircle } from "lucide-react";
import {
  aniversariantes,
  mensagemDeAniversario,
  type Aniversariante,
} from "@/lib/dados/aniversariantes";
import { linkWhatsapp } from "@/components/CardWhatsapp";
import styles from "./dashboard.module.css";

/*
 * Os aniversários dos clientes.
 *
 * Mensagem de aniversário só vale no dia - depois é pior do
 * que não ter mandado. Por isso ela mora no painel, que a loja
 * abre todo dia, e não numa tela que alguém precisa lembrar de
 * visitar.
 *
 * A semana seguinte aparece junto para quem fecha no domingo
 * ou tira folga não perder ninguém.
 */

function Quando({ faltam }: { faltam: number }) {
  const texto =
    faltam === 1
      ? "amanhã"
      : faltam === 2
        ? "depois de amanhã"
        : `em ${faltam} dias`;

  return (
    <span className="text-[11px] font-bold text-black/45">
      {texto}
    </span>
  );
}

/*
 * O botão que abre a conversa já com a mensagem escrita.
 *
 * Vem nulo quando o telefone do cadastro não dá para usar -
 * melhor não ter botão do que ter um que abre o WhatsApp num
 * número quebrado.
 */
function Parabenizar({
  pessoa,
  destaque,
}: {
  pessoa: Aniversariante;
  destaque?: boolean;
}) {
  const link = linkWhatsapp(
    pessoa.telefone,
    mensagemDeAniversario(pessoa.nome)
  );

  if (!link) {
    return (
      <span className="text-[11px] font-bold text-black/40">
        sem telefone
      </span>
    );
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition ${
        destaque
          ? "bg-emerald-500 text-black hover:bg-emerald-400"
          : "border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10"
      }`}
    >
      <MessageCircle size={14} />
      Parabenizar
    </a>
  );
}

export default async function Aniversariantes() {
  const dados = await aniversariantes();

  if (dados.erro) return null;

  return (
    <div className={styles.panel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-black">
            Aniversários
          </h2>

          <p className="text-xs font-bold text-black/45">
            Clientes que fazem aniversário hoje e nos próximos
            7 dias
          </p>
        </div>

        <span
          className={`${styles.dataPill} flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-black/65`}
        >
          <Cake size={14} className="text-[#a97800]" />
          {dados.hoje.length > 0
            ? `${dados.hoje.length} hoje`
            : "ninguém hoje"}
        </span>
      </div>

      {/*
        * O de hoje vem em destaque dourado.
        *
        * É o único que não pode esperar: amanhã a mensagem
        * perde a graça, e o cliente lembra que a loja esqueceu.
        */}
      {dados.hoje.length > 0 && (
        <div
          className={`${styles.goldPanel} mb-4 rounded-2xl p-4`}
        >
          <div className="space-y-3">
            {dados.hoje.map((pessoa) => (
              <div
                key={pessoa.id}
                className="flex flex-wrap items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/clientes/${pessoa.id}`}
                    className="block truncate text-sm font-black text-black hover:underline"
                  >
                    {pessoa.nome}
                  </Link>

                  <p className="text-[11px] font-bold text-black/50">
                    faz aniversário hoje
                    {pessoa.idade
                      ? ` · completa ${pessoa.idade} anos`
                      : ""}
                  </p>
                </div>

                <Parabenizar pessoa={pessoa} destaque />
              </div>
            ))}
          </div>
        </div>
      )}

      {dados.proximos.length > 0 ? (
        <div className="space-y-1">
          {dados.proximos.map((pessoa) => (
            <div
              key={pessoa.id}
              className="flex flex-wrap items-center gap-3 rounded-xl px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/clientes/${pessoa.id}`}
                  className="block truncate text-sm font-black text-black hover:underline"
                >
                  {pessoa.nome}
                </Link>

                <p className="text-[11px] font-bold text-black/45">
                  {pessoa.dia} · <Quando faltam={pessoa.faltam} />
                </p>
              </div>

              <Parabenizar pessoa={pessoa} />
            </div>
          ))}
        </div>
      ) : (
        dados.hoje.length === 0 && (
          <p className="text-sm font-semibold leading-6 text-black/55">
            Ninguém faz aniversário nos próximos 7 dias.
          </p>
        )
      )}

      {/*
        * Quantos clientes estão sem a data.
        *
        * Sem isto, uma lista vazia pareceria "não tem
        * aniversário" quando na verdade é "não tem o dado" - e
        * ninguém iria atrás de preencher.
        */}
      {dados.semData > 0 && (
        <Link
          href="/clientes?semData=1"
          className="mt-3 block border-t border-white/10 pt-3 text-[11px] font-bold text-black/40 transition hover:text-[#f0c640]"
        >
          {dados.semData}{" "}
          {dados.semData === 1
            ? "cliente está sem data de nascimento e nunca vai aparecer aqui"
            : "clientes estão sem data de nascimento e nunca vão aparecer aqui"}
          . Clique para ver quem são.
        </Link>
      )}
    </div>
  );
}
