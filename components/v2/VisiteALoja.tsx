import {
  ArrowUpRight,
  Clock,
  MapPin,
  Phone,
} from "lucide-react";
import {
  GOOGLE,
  HORARIOS,
  LOJA,
} from "@/lib/dados/loja";
import AoEntrar from "@/components/v2/AoEntrar";

/*
 * Visite nossa loja.
 *
 * Endereço, horário e telefone saem do mesmo lugar que o
 * rodapé e os dados que o Google lê - mudar num arquivo muda
 * em todos, e nenhum canto do site fica mentindo.
 *
 * Não há foto da fachada no projeto, então o lugar dela é um
 * mapa de verdade: o cliente quer saber como chegar, não ver
 * a porta. O mapa é carregado preguiçosamente e sem cookie
 * nosso - é um <iframe> do Google, que só sobe quando a seção
 * chega perto da tela.
 */

const MAPA = `https://www.google.com/maps?q=${encodeURIComponent(
  `${LOJA.endereco}, ${LOJA.bairro}, ${LOJA.cidade} - ${LOJA.estado}`
)}&output=embed`;

export default function VisiteALoja() {
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-20">
      <AoEntrar>
        <h2 className="titulo text-[clamp(1.9rem,4.5vw,2.8rem)] claro">
          Visite nossa <span className="ouro">loja</span>
        </h2>

        <p className="mt-2 text-sm suave sm:text-base">
          Conheça o pátio de perto, sem compromisso.
        </p>
      </AoEntrar>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <AoEntrar>
          <div className="vidro overflow-hidden">
            <iframe
              src={MAPA}
              title={`Mapa até a ${LOJA.nome}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="mapa-escuro h-[19rem] w-full border-0 lg:h-full lg:min-h-[23rem]"
            />
          </div>
        </AoEntrar>

        <AoEntrar atraso={100}>
          <div className="vidro h-full p-6 sm:p-7">
            <ul className="space-y-5">
              <li className="flex gap-3.5">
                <MapPin
                  size={18}
                  className="mt-0.5 shrink-0 ouro"
                />

                <span className="text-sm leading-7">
                  <span className="block font-bold claro">
                    {LOJA.endereco}
                  </span>
                  <span className="block suave">
                    {LOJA.bairro} · {LOJA.cidade} -{" "}
                    {LOJA.estado}
                  </span>
                  <span className="block suave">
                    CEP {LOJA.cep}
                  </span>
                </span>
              </li>

              <li className="flex gap-3.5">
                <Phone
                  size={18}
                  className="mt-0.5 shrink-0 ouro"
                />

                <span className="text-sm leading-7">
                  <span className="block font-bold claro">
                    {LOJA.whatsappExibicao}
                  </span>
                  <span className="block suave">
                    WhatsApp e telefone
                  </span>
                </span>
              </li>

              <li className="flex gap-3.5">
                <Clock
                  size={18}
                  className="mt-0.5 shrink-0 ouro"
                />

                <div className="w-full text-sm">
                  {HORARIOS.map((item) => (
                    <div
                      key={item.texto}
                      className="flex justify-between gap-4 border-b border-white/[.07] py-1.5 last:border-0"
                    >
                      <span className="suave">
                        {item.texto}
                      </span>
                      <span className="claro">
                        {item.horas}
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            </ul>

            <a
              href={GOOGLE.perfil}
              target="_blank"
              rel="noopener noreferrer"
              className="botao-ouro mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm"
            >
              Ver no mapa
              <ArrowUpRight size={16} />
            </a>
          </div>
        </AoEntrar>
      </div>
    </section>
  );
}
