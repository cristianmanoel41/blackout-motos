import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bike,
  Calculator,
  Clock,
  Globe,
  MessageCircle,
  Minus,
  Route,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  visitasDoSite,
  type Comparacao,
  type MotoVista,
  type Resumo as ResumoDoPeriodo,
  type Visitas,
} from "@/lib/dados/visitas-site";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import GraficoVisitas from "@/components/GraficoVisitas";
import Dobravel from "@/components/Dobravel";
import styles from "./dashboard.module.css";

/*
 * Os acessos ao site, num bloco só.
 *
 * Antes eram dois: a contagem da Vercel, por período, e a
 * nossa, por tipo de coisa medida. Dois eixos diferentes, com
 * números diferentes, para a mesma pergunta - e a pergunta que
 * a loja faz é sempre a mesma: quanta gente entrou hoje?
 *
 * Agora é um só, no eixo que a loja pensa: hoje, 7 dias, 30
 * dias. E os números são os nossos, que dão para explicar linha
 * por linha - a Vercel entrega um total e não diz de onde veio.
 *
 * Abaixo dos períodos fica o que só a nossa medição sabe: qual
 * moto foi vista, de onde veio a pessoa e a que horas o site
 * enche. É onde o número vira decisão:
 *
 *   - a moto mais vista sem ninguém chamar é preço alto;
 *   - a moto que ninguém abre é foto ruim ou anúncio parado;
 *   - a origem que traz gente é onde vale gastar;
 *   - o horário de pico é quando alguém precisa estar no
 *     WhatsApp respondendo.
 */

function numero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

/*
 * O resumo que se lê sem parar para pensar.
 *
 * Todo o resto do bloco é número em cartão, e número em cartão
 * exige que alguém leia o rótulo, ache o valor e faça a conta
 * na cabeça. Esta faixa faz isso por quem olha: uma frase em
 * português com o dia de hoje, e ao lado o rumo da semana.
 *
 * É o primeiro lugar onde o olho cai, e na maioria dos dias vai
 * ser o único que a loja precisa ler.
 */
function Resumo({
  hoje,
  comparacao,
  atencao,
  soHoje,
}: {
  hoje: ResumoDoPeriodo;
  comparacao: Comparacao;
  atencao: MotoVista | null;
  /* Na dashboard fica só a frase do dia: o rumo da semana e a
     moto do mês moram na tela completa. */
  soHoje?: boolean;
}) {
  /*
   * A cor vem de CLASSE, nunca de estilo em linha.
   *
   * O AppShell pinta de preto, com !important, todo <span> do
   * sistema - e dentro destes cartões escuros preto é
   * invisível. Estilo em linha não vence !important de folha
   * de estilo; classe que o tema conheça, vence.
   */
  const RUMO = {
    subindo: {
      Icone: TrendingUp,
      cor: "text-emerald-400",
      texto: `${Math.abs(comparacao.variacao)}% a mais que na semana passada`,
    },
    caindo: {
      Icone: TrendingDown,
      cor: "text-red-400",
      texto: `${Math.abs(comparacao.variacao)}% a menos que na semana passada`,
    },
    parado: {
      Icone: Minus,
      cor: "text-black/45",
      texto: "no mesmo ritmo da semana passada",
    },
    cedo: {
      Icone: Minus,
      cor: "text-black/45",
      texto: "ainda sem semana anterior para comparar",
    },
  }[comparacao.rumo];

  return (
    <div className={`${styles.goldPanel} rounded-2xl p-5`}>
      <p className="text-[15px] font-bold leading-7 text-black/75 sm:text-base">
        {hoje.visitas === 0 ? (
          <>Ninguém entrou no site ainda hoje.</>
        ) : (
          <>
            Hoje{" "}
            <strong className="text-black">
              {numero(hoje.visitas)}{" "}
              {hoje.visitas === 1 ? "pessoa" : "pessoas"}
            </strong>{" "}
            {hoje.visitas === 1 ? "entrou" : "entraram"} no
            site,{" "}
            <strong className="text-black">
              {numero(hoje.fichas)}
            </strong>{" "}
            {hoje.fichas === 1
              ? "abriu ficha de moto"
              : "abriram ficha de moto"}{" "}
            e{" "}
            <strong className="text-black">
              {numero(hoje.whatsapp)}
            </strong>{" "}
            {hoje.whatsapp === 1 ? "chamou" : "chamaram"} no
            WhatsApp.
          </>
        )}
      </p>

      {!soHoje && (
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          className={`flex items-center gap-1.5 text-[13px] font-black ${RUMO.cor}`}
        >
          <RUMO.Icone size={15} />
          {RUMO.texto}
        </span>

        <span className="text-[13px] font-bold text-black/45">
          A semana está em{" "}
          <strong className="text-black/70">
            {comparacao.porDia.toLocaleString("pt-BR")} pessoas
            por dia
          </strong>
        </span>
      </div>
      )}

      {atencao && !soHoje && (
        <p className="mt-4 border-t border-white/10 pt-3 text-[13px] font-bold leading-6 text-black/55">
          {/* text-[#a97800] é o dourado que o tema do painel
              reconhece e repinta; cor em linha sumiria. */}
          <span className="text-[#a97800]">Vale olhar:</span>{" "}
          <strong className="text-black">
            {atencao.nome}
          </strong>{" "}
          foi a moto mais vista do mês —{" "}
          {atencao.visitas} pessoas abriram a ficha e{" "}
          <strong className="text-black">
            nenhuma chamou
          </strong>
          {atencao.diasNoPatio !== null &&
            `, e ela está há ${atencao.diasNoPatio} dias no pátio`}
          . Costuma ser preço, ou foto que promete menos do que
          a moto é.
        </p>
      )}
    </div>
  );
}

function Detalhe({
  rotulo,
  valor,
  verde,
}: {
  rotulo: string;
  valor: number;
  verde?: boolean;
}) {
  /*
   * A cor do número TEM que vir de classe, nunca de estilo.
   *
   * O AppShell pinta de preto, com !important, todo <span> do
   * sistema (`.legibilidade span` em AppShell.module.css).
   * Dentro destes cartões escuros, preto é invisível - foi
   * assim que o número do WhatsApp sumiu em 30/09/2026,
   * enquanto os outros dois apareciam: eles tinham classe de
   * cor, e este não tinha.
   *
   * Escrever a cor no `style` não salva: !important de folha de
   * estilo ganha de estilo em linha. O que ganha é classe que o
   * tema do painel conheça - `text-black` (que ele repinta de
   * dourado) e `text-emerald-*` (que ele repinta de verde).
   *
   * `shrink-0` porque "Chamaram no WhatsApp" é o rótulo mais
   * comprido dos três, e sem isso ele espreme o valor.
   */
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] font-bold text-black/45">
        {rotulo}
      </span>

      <span
        className={`shrink-0 text-sm font-black ${
          verde ? "text-emerald-400" : "text-black"
        }`}
      >
        {numero(valor)}
      </span>
    </div>
  );
}

/*
 * Um período.
 *
 * A visita vem grande, e o resto embaixo em letra menor: é a
 * visita que responde "quanta gente entrou", e as outras três
 * explicam o que essa gente fez.
 */
function Periodo({
  titulo,
  quando,
  dados,
}: {
  titulo: string;
  quando: string;
  dados: ResumoDoPeriodo;
}) {
  return (
    <div className={styles.miniCard}>
      <div className="flex items-center gap-3">
        <div className={styles.icon3d}>
          <Users size={20} />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
            {titulo}
          </p>

          <p className="mt-0.5 text-2xl font-black leading-none text-black">
            {numero(dados.visitas)}
          </p>

          <p className="mt-1 text-[11px] font-bold text-black/45">
            {dados.visitas === 1 ? "visita" : "visitas"} ·{" "}
            {quando}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3">
        <Detalhe rotulo="Telas abertas" valor={dados.telas} />

        <Detalhe
          rotulo="Fichas de moto"
          valor={dados.fichas}
        />

        <Detalhe
          rotulo="Chamaram no WhatsApp"
          valor={dados.whatsapp}
          verde
        />
      </div>
    </div>
  );
}

/*
 * Quantos clientes simularam pagamento, por período.
 *
 * Fica separado das visitas porque responde outra pergunta:
 * não "quanta gente entrou", e sim "quanta gente chegou a fazer
 * a conta". Banco e cartão lado a lado mostram também qual dos
 * dois o cliente procura mais.
 */
function Simulacoes({
  dados,
  soHoje,
}: {
  dados: Visitas["simulacoes"];
  /* Na dashboard: um cartão só, do dia, ao lado das visitas. */
  soHoje?: boolean;
}) {
  if (soHoje) {
    return (
      <div className={styles.miniCard}>
        <div className="flex items-center gap-3">
          <div className={styles.icon3d}>
            <Calculator size={20} />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
              Simulações hoje
            </p>

            <p className="mt-0.5 text-2xl font-black leading-none text-black">
              {numero(
                dados.hoje.financiamento + dados.hoje.cartao
              )}
            </p>

            <p className="mt-1 text-[11px] font-bold text-black/45">
              clientes viram a parcela no site
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3">
          {dados.instalado ? (
            <>
              <Detalhe
                rotulo="Financiamento"
                valor={dados.hoje.financiamento}
              />

              <Detalhe
                rotulo="Cartão de crédito"
                valor={dados.hoje.cartao}
              />
            </>
          ) : (
            <p className="text-[11px] font-bold leading-5 text-black/45">
              Falta rodar no Supabase o SQL{" "}
              <span className="text-black/70">
                0033_simulacoes_site.sql
              </span>
              .
            </p>
          )}
        </div>
      </div>
    );
  }

  const periodos = [
    { titulo: "Hoje", valores: dados.hoje },
    { titulo: "7 dias", valores: dados.semana },
    { titulo: "30 dias", valores: dados.mes },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Calculator size={15} className="text-[#a97800]" />

        <h3 className="text-sm font-black text-black">
          Simulações de pagamento
        </h3>
      </div>

      {!dados.instalado ? (
        <p className="text-sm font-semibold leading-6 text-black/55">
          Falta rodar o SQL que ensina o banco a guardar as
          simulações. No Supabase, SQL Editor, rode{" "}
          <span className="font-black text-black/75">
            supabase/migrations/0033_simulacoes_site.sql
          </span>{" "}
          inteiro. Enquanto isso o simulador funciona normal; só
          não é contado.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {periodos.map((periodo) => (
              <div key={periodo.titulo} className={styles.miniCard}>
                <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
                  {periodo.titulo}
                </p>

                <div className="mt-3 space-y-1.5">
                  <Detalhe
                    rotulo="Financiamento"
                    valor={periodo.valores.financiamento}
                  />

                  <Detalhe
                    rotulo="Cartão de crédito"
                    valor={periodo.valores.cartao}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-2 text-[11px] font-bold leading-5 text-black/40">
            Conta cada cliente que chegou a ver a parcela no
            simulador do site — uma vez por forma de pagamento,
            mesmo que ele mude os valores várias vezes.
          </p>
        </>
      )}
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

/*
 * Duas versões do mesmo painel.
 *
 * Na dashboard fica só o dia de hoje: é o número que a loja
 * olha toda vez que abre o sistema, e o resto (semana, mês,
 * motos mais vistas, origem, gráficos) empurrava o painel para
 * baixo sem ser lido. Tudo isso continua em /dashboard/acessos,
 * a um clique, com `completo`.
 */
export default async function AcessosDoSite({
  completo = false,
}: {
  completo?: boolean;
}) {
  const dados = await visitasDoSite();

  const maisVista = dados.motos[0]?.visitas || 1;
  const maiorOrigem = dados.origens[0]?.chegadas || 1;

  const pico = dados.horas.reduce(
    (maior, hora) =>
      hora.visitas > maior.visitas ? hora : maior,
    { hora: 0, rotulo: "—", visitas: 0 }
  );

  return (
    <div className={styles.panel}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-black">
            Acessos ao site
          </h2>

          <p className="text-xs font-bold text-black/45">
            {completo
              ? "Quantas pessoas entraram em blackoutmotos.com.br"
              : "Hoje, desde a meia-noite"}
          </p>
        </div>

        {completo ? (
          <span
            className={`${styles.dataPill} flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-black/65`}
          >
            <Globe size={14} className="text-[#a97800]" />
            Só o site
          </span>
        ) : (
          <Link
            href="/dashboard/acessos"
            className={`${styles.dataPill} flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-black/65`}
          >
            <BarChart3 size={14} className="text-[#a97800]" />
            Ver todas as métricas
            <ArrowRight size={14} className="text-[#a97800]" />
          </Link>
        )}
      </div>

      {/*
        * A frase que desfaz a confusão.
        *
        * Visita e tela são números diferentes de propósito, e
        * sem isto escrito na tela um parece erro do outro.
        */}
      {completo && (
        <p className="mb-5 text-[11px] font-bold leading-5 text-black/40">
          <span className="text-black/60">Visita</span> é cada
          vez que alguém entra no site.{" "}
          <span className="text-black/60">Tela</span> é cada
          página aberta — quem entra e olha cinco motos conta
          como uma visita e seis telas. O sistema da loja fica
          fora da conta: só o site público é medido.
        </p>
      )}

      {!dados.instalado ? (
        <p className="text-sm font-semibold leading-6 text-black/55">
          Falta criar a tabela no banco. No Supabase, abra o SQL
          Editor e rode os arquivos{" "}
          <span className="font-black text-black/75">
            supabase/migrations/0029_visitas_site.sql
          </span>{" "}
          e{" "}
          <span className="font-black text-black/75">
            0030_visitas_resumo_com_entradas.sql
          </span>{" "}
          inteiros. Podem ser rodados mais de uma vez sem
          quebrar nada. Enquanto isso o site continua normal; só
          não guarda o que foi visto.
        </p>
      ) : dados.precisaMigrar ? (
        <p className="text-sm font-semibold leading-6 text-black/55">
          Falta rodar o SQL que ensina o banco a contar visita —
          hoje ele só sabe contar tela aberta. No Supabase, SQL
          Editor, rode{" "}
          <span className="font-black text-black/75">
            supabase/migrations/0030_visitas_resumo_com_entradas.sql
          </span>
          . É rápido, e os números aparecem na hora seguinte.
        </p>
      ) : !completo ? (
        <div className="mt-4 space-y-4">
          {!dados.vazio && (
            <Resumo
              hoje={dados.hoje}
              comparacao={dados.comparacao}
              atencao={dados.atencao}
              soHoje
            />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Periodo
              titulo="Hoje"
              quando="desde a meia-noite"
              dados={dados.hoje}
            />

            <Simulacoes dados={dados.simulacoes} soHoje />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {!dados.vazio && (
            <Resumo
              hoje={dados.hoje}
              comparacao={dados.comparacao}
              atencao={dados.atencao}
            />
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Periodo
              titulo="Hoje"
              quando="desde a meia-noite"
              dados={dados.hoje}
            />

            <Periodo
              titulo="7 dias"
              quando="contando hoje"
              dados={dados.semana}
            />

            <Periodo
              titulo="30 dias"
              quando="contando hoje"
              dados={dados.mes}
            />
          </div>

          <Simulacoes dados={dados.simulacoes} />

          {dados.vazio ? (
            <p className="text-sm font-semibold leading-6 text-black/55">
              A medição está de pé e ainda não registrou visita.
              Os números aparecem sozinhos conforme as pessoas
              entram no site — nada do que se faz aqui no
              computador entra na conta.
            </p>
          ) : (
            <>
              <div className="grid gap-5 lg:grid-cols-2">
                <Dobravel
                  nome="motos"
                  titulo="Motos mais vistas"
                  detalhe="— 30 dias"
                  padrao
                  icone={
                    <Bike
                      size={15}
                      className="text-[#a97800]"
                    />
                  }
                >
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
                </Dobravel>

                <Dobravel
                  nome="origens"
                  titulo="De onde vem a gente"
                  detalhe="— 30 dias"
                  padrao
                  icone={
                    <Route
                      size={15}
                      className="text-[#a97800]"
                    />
                  }
                >
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
                              ? "1 visita"
                              : `${origem.chegadas} visitas`
                          }
                          valor={origem.chegadas}
                          parte={
                            (origem.chegadas / maiorOrigem) *
                            100
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
                </Dobravel>
              </div>

              {/*
                * Os dois gráficos nascem fechados.
                *
                * São eles que faziam a tela ficar comprida, e
                * a pergunta do dia a dia - quanta gente entrou,
                * qual moto foi vista - já está respondida acima
                * deles. Quem quiser a forma da semana abre, e
                * fica aberto para a próxima vez.
                */}
              <Dobravel
                nome="grafico-dias"
                titulo="Pessoas por dia"
                detalhe="— 30 dias"
              >
                <GraficoVisitas dados={dados.dias} cabem={8} />
              </Dobravel>

              <Dobravel
                nome="grafico-horas"
                titulo="A que horas a gente chega"
                detalhe={
                  pico.visitas > 0
                    ? `— mais gente chega às ${pico.rotulo}`
                    : undefined
                }
                icone={
                  <Clock
                    size={15}
                    className="text-[#a97800]"
                  />
                }
              >
                <GraficoVisitas
                  dados={dados.horas}
                  cabem={12}
                  altura={180}
                />
              </Dobravel>
            </>
          )}
        </div>
      )}
    </div>
  );
}
