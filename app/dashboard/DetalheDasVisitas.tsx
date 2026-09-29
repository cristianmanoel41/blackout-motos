import {
  Bike,
  Clock,
  MessageCircle,
  MousePointerClick,
  Route,
  TrendingUp,
} from "lucide-react";
import { visitasDoSite } from "@/lib/dados/visitas-site";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import GraficoVisitas from "@/components/GraficoVisitas";
import styles from "./dashboard.module.css";

/*
 * O detalhe das visitas ao site.
 *
 * O painel de cima, o da Vercel, diz quanta gente entrou. Este
 * diz o que essa gente fez - e é aqui que o número vira
 * decisão:
 *
 *   - a moto mais vista sem ninguém chamar é preço alto;
 *   - a moto que ninguém abre é foto ruim ou anúncio parado;
 *   - a origem que traz gente é onde vale gastar;
 *   - o horário de pico é quando alguém precisa estar no
 *     WhatsApp respondendo.
 *
 * Tudo em 30 dias. Janela curta em loja de moto engana: uma
 * semana com feriado parece queda e é só feriado.
 */

function Cartao({
  titulo,
  valor,
  abaixo,
  Icone,
}: {
  titulo: string;
  valor: string;
  abaixo: string;
  Icone: typeof Bike;
}) {
  return (
    <div className={styles.miniCard}>
      <div className="flex items-center gap-3">
        <div className={styles.icon3d}>
          <Icone size={20} />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
            {titulo}
          </p>

          <p className="mt-1 text-lg font-black text-black">
            {valor}
          </p>

          <p className="mt-0.5 text-[11px] font-bold text-black/45">
            {abaixo}
          </p>
        </div>
      </div>
    </div>
  );
}

/*
 * Uma linha de ranking, com a barra atrás do texto.
 *
 * A barra é proporção, não medida: ela compara com o primeiro
 * colocado. Serve para o olho achar o degrau entre o primeiro e
 * o quinto sem ler número nenhum - o número fica à direita para
 * quem quiser conferir.
 */
function Linha({
  titulo,
  detalhe,
  valor,
  parte,
  aoLado,
}: {
  titulo: string;
  detalhe: string;
  valor: number;
  parte: number;
  aoLado?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl px-3 py-2.5">
      <div
        className="absolute inset-y-0 left-0 rounded-xl"
        style={{
          width: `${Math.max(parte, 2)}%`,
          background: "rgba(224,177,41,.14)",
        }}
        aria-hidden
      />

      <div className="relative flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-black">
            {titulo}
          </p>

          <p className="mt-0.5 truncate text-[11px] font-bold text-black/45">
            {detalhe}
          </p>
        </div>

        {aoLado && (
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-black text-emerald-400">
            <MessageCircle size={12} />
            {aoLado}
          </span>
        )}

        <span className="shrink-0 text-sm font-black text-black">
          {valor}
        </span>
      </div>
    </div>
  );
}

export default async function DetalheDasVisitas() {
  const dados = await visitasDoSite();

  const conversa =
    dados.mes.fichas > 0
      ? Math.round(
          (dados.mes.whatsapp / dados.mes.fichas) * 100
        )
      : 0;

  const maisVista = dados.motos[0]?.visitas || 1;
  const maiorOrigem = dados.origens[0]?.chegadas || 1;

  const pico = dados.horas.reduce(
    (maior, hora) =>
      hora.visitas > maior.visitas ? hora : maior,
    { hora: 0, rotulo: "—", visitas: 0 }
  );

  return (
    <div className={styles.panel}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-black">
            Detalhe das visitas
          </h2>

          <p className="text-xs font-bold text-black/45">
            Qual moto foi vista, de onde veio a pessoa e a que
            horas o site enche
          </p>
        </div>

        <span
          className={`${styles.dataPill} flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-black/65`}
        >
          <TrendingUp size={14} className="text-[#a97800]" />
          Últimos 30 dias
        </span>
      </div>

      {!dados.instalado ? (
        <p className="text-sm font-semibold leading-6 text-black/55">
          Falta criar a tabela no banco. No Supabase, abra o SQL
          Editor e rode o arquivo{" "}
          <span className="font-black text-black/75">
            supabase/migrations/0029_visitas_site.sql
          </span>{" "}
          inteiro. Ele pode ser rodado mais de uma vez sem
          quebrar nada. Enquanto isso o site continua normal;
          só não guarda o que foi visto.
        </p>
      ) : dados.vazio ? (
        <p className="text-sm font-semibold leading-6 text-black/55">
          A medição está de pé e ainda não registrou visita. Os
          números aparecem sozinhos conforme as pessoas entram
          no site — a contagem só vale no site publicado, então
          nada do que se faz aqui no computador entra na conta.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Cartao
              titulo="Telas abertas"
              valor={new Intl.NumberFormat("pt-BR").format(
                dados.mes.telas
              )}
              abaixo={`${dados.hoje.telas} hoje · ${dados.semana.telas} na semana`}
              Icone={MousePointerClick}
            />

            <Cartao
              titulo="Fichas de moto"
              valor={new Intl.NumberFormat("pt-BR").format(
                dados.mes.fichas
              )}
              abaixo={`${dados.hoje.fichas} hoje · ${dados.semana.fichas} na semana`}
              Icone={Bike}
            />

            <Cartao
              titulo="Chamaram no WhatsApp"
              valor={new Intl.NumberFormat("pt-BR").format(
                dados.mes.whatsapp
              )}
              abaixo={`${conversa} a cada 100 fichas abertas`}
              Icone={MessageCircle}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-black">
                <Bike size={15} className="text-[#a97800]" />
                Motos mais vistas
              </h3>

              {dados.motos.length === 0 ? (
                <p className="px-3 text-xs font-bold text-black/45">
                  Ninguém abriu ficha de moto ainda.
                </p>
              ) : (
                <div className="space-y-1">
                  {dados.motos.map((moto) => (
                    <Linha
                      key={moto.id}
                      titulo={moto.nome}
                      detalhe={[
                        moto.ano,
                        moto.preco
                          ? formatarMoeda(moto.preco)
                          : "Sem preço",
                        moto.vendida
                          ? "Vendida"
                          : moto.diasNoPatio !== null
                            ? `${moto.diasNoPatio} dias no pátio`
                            : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      valor={moto.visitas}
                      parte={
                        (moto.visitas / maisVista) * 100
                      }
                      aoLado={
                        moto.whatsapp > 0
                          ? String(moto.whatsapp)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-black">
                <Route size={15} className="text-[#a97800]" />
                De onde vem a gente
              </h3>

              {dados.origens.length === 0 ? (
                <p className="px-3 text-xs font-bold text-black/45">
                  Ainda não deu para saber de onde vieram.
                </p>
              ) : (
                <div className="space-y-1">
                  {dados.origens.map((origem) => (
                    <Linha
                      key={origem.origem}
                      titulo={origem.origem}
                      detalhe={
                        origem.chegadas === 1
                          ? "1 chegada"
                          : `${origem.chegadas} chegadas`
                      }
                      valor={origem.chegadas}
                      parte={
                        (origem.chegadas / maiorOrigem) * 100
                      }
                      aoLado={
                        origem.whatsapp > 0
                          ? String(origem.whatsapp)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-black text-black">
              Movimento dia a dia
            </h3>

            <GraficoVisitas dados={dados.dias} cabem={8} />
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-black">
              <Clock size={15} className="text-[#a97800]" />
              Horário de movimento
              {pico.visitas > 0 && (
                <span className="text-[11px] font-bold text-black/45">
                  — o pico é às {pico.rotulo}
                </span>
              )}
            </h3>

            <GraficoVisitas
              dados={dados.horas}
              cabem={12}
              altura={180}
            />
          </div>
        </div>
      )}
    </div>
  );
}
