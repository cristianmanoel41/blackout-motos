import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Bike,
  Cake,
  FileWarning,
  Globe,
  Sun,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { aniversariantes } from "@/lib/dados/aniversariantes";
import { motosDosLancamentos } from "@/lib/dados/moto-do-lancamento";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import MandarParabens from "@/components/MandarParabens";
import MandarResumo from "./MandarResumo";

/*
 * O RESUMO DO DIA
 *
 * O que a loja precisa resolver hoje, numa tela só: quem faz
 * aniversário, o que vence no caixa, venda com a transferência
 * atrasando, moto parada no pátio e o que o site trouxe.
 *
 * Tudo já existia espalhado pelo sistema - só aparecia para
 * quem abrisse cada tela e procurasse. Aqui nada é calculado de
 * novo nem gravado: é leitura. O botão de baixo manda o mesmo
 * texto para o WhatsApp, para ler no celular.
 */

export const dynamic = "force-dynamic";

/* Quantos dias sem transferência já pedem atenção. O prazo
   legal é 30: o aviso vem antes de virar problema. */
const DIAS_TRANSFERENCIA = 20;

/* A partir de quantos dias a moto conta como parada. */
const DIAS_PARADA = 60;

const SEMANA = [
  "domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado",
];

/* A loja é em São José dos Campos; o servidor roda em UTC. Sem
   isso, depois das 21h o resumo já seria "de amanhã". */
function hojeEmSaoPaulo() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return partes; // "2026-11-10"
}

function diasEntre(de: string, ate: string) {
  const um = new Date(`${de.slice(0, 10)}T12:00:00Z`).getTime();
  const outro = new Date(`${ate.slice(0, 10)}T12:00:00Z`).getTime();
  return Math.round((outro - um) / 86400000);
}

function somarDias(dia: string, quantos: number) {
  const data = new Date(`${dia}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + quantos);
  return data.toISOString().slice(0, 10);
}

type MotoCurta = {
  id: string;
  marca: string | null;
  modelo: string | null;
  placa: string | null;
};

function nomeCurto(moto?: MotoCurta | null) {
  if (!moto) return "Moto";
  const nome = [moto.marca, moto.modelo].filter(Boolean).join(" ") || "Moto";
  return moto.placa ? `${nome} · ${String(moto.placa).toUpperCase()}` : nome;
}

export default async function ResumoDoDia() {
  const supabase = await createClient();

  const hoje = hojeEmSaoPaulo();
  const ontem = somarDias(hoje, -1);
  const inicioMes = `${hoje.slice(0, 8)}01`;
  const limiteTransferencia = somarDias(hoje, -DIAS_TRANSFERENCIA);

  const [
    aniversarios,
    caixa,
    vendasAbertas,
    patio,
    interesse,
    porDia,
    maisVista,
    vendasMes,
    comprasMes,
  ] = await Promise.all([
    aniversariantes(),
    supabase
      .from("cash_transactions")
      .select("id, data, tipo, origem, origem_id, valor, descricao")
      .eq("confirmado", false)
      .lte("data", hoje)
      .order("data", { ascending: true }),
    supabase
      .from("sales")
      .select("id, motorcycle_id, cliente, data_venda")
      .eq("status", "ativa")
      .or("documentacao_concluida.is.null,documentacao_concluida.eq.false")
      .lte("data_venda", limiteTransferencia)
      .order("data_venda", { ascending: true }),
    supabase
      .from("motorcycles")
      .select("id, marca, modelo, placa, data_entrada")
      .eq("status", "disponivel"),
    supabase
      .from("interessados")
      .select("id, nome, procura, criado_em")
      .gte("criado_em", `${ontem}T03:00:00Z`)
      .order("criado_em", { ascending: false }),
    supabase.rpc("visitas_por_dia", { p_dias: 2 }),
    supabase.rpc("visitas_por_moto", { p_dias: 7, p_quanto: 1 }),
    supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativa")
      .gte("data_venda", inicioMes)
      .lte("data_venda", hoje),
    supabase
      .from("motorcycles")
      .select("id", { count: "exact", head: true })
      .eq("tipo_entrada", "compra_nova")
      .gte("data_entrada", inicioMes)
      .lte("data_entrada", hoje),
  ]);

  /* ---------- Caixa ---------- */
  const pendentes = caixa.data || [];
  const motosDoCaixa = await motosDosLancamentos(supabase, pendentes).catch(
    () => ({} as Awaited<ReturnType<typeof motosDosLancamentos>>)
  );
  const vencemHoje = pendentes.filter((t) => String(t.data).slice(0, 10) === hoje);
  const atrasados = pendentes.filter((t) => String(t.data).slice(0, 10) < hoje);
  const somar = (lista: typeof pendentes) =>
    lista.reduce((soma, t) => soma + (Number(t.valor) || 0), 0);

  /* ---------- Documentação ---------- */
  const vendas = vendasAbertas.data || [];
  const idsMotosVendidas = vendas.map((v) => v.motorcycle_id).filter(Boolean);
  const { data: motosVendidas } = idsMotosVendidas.length
    ? await supabase
        .from("motorcycles")
        .select("id, marca, modelo, placa")
        .in("id", idsMotosVendidas)
    : { data: [] as MotoCurta[] };
  const motoPorId = new Map(
    ((motosVendidas || []) as MotoCurta[]).map((m) => [String(m.id), m])
  );

  /* ---------- Pátio ---------- */
  const disponiveis = patio.data || [];
  const paradas = disponiveis
    .map((m) => ({
      ...m,
      dias: m.data_entrada ? diasEntre(m.data_entrada, hoje) : null,
    }))
    .filter((m) => m.dias !== null && m.dias >= DIAS_PARADA)
    .sort((a, b) => (b.dias || 0) - (a.dias || 0));

  /* ---------- Site ---------- */
  const novosInteresse = interesse.data || [];
  const visitasOntem =
    ((porDia.data || []) as Array<Record<string, unknown>>).find(
      (linha) => String(linha.dia || "").slice(0, 10) === ontem
    ) || null;
  const pessoasOntem = visitasOntem
    ? Number(visitasOntem.pessoas ?? visitasOntem.visitas) || 0
    : null;
  const topo = ((maisVista.data || []) as Array<Record<string, unknown>>)[0];
  const motoMaisVista = topo
    ? {
        nome:
          [topo.marca, topo.modelo, topo.versao].filter(Boolean).join(" ") || "Moto",
        visitas: Number(topo.visitas) || 0,
      }
    : null;

  /* ---------- O dia, escrito ---------- */
  const [ano, mes, dia] = hoje.split("-");
  const diaDaSemana = SEMANA[new Date(`${hoje}T12:00:00Z`).getUTCDay()];

  const linhas: string[] = [
    `*☀️ Blackout Motos · ${diaDaSemana}, ${dia}/${mes}/${ano}*`,
    "",
    `*🎂 Aniversariantes hoje (${aniversarios.hoje.length})*`,
    ...(aniversarios.hoje.length
      ? aniversarios.hoje.map((p) => `• ${p.nome}${p.idade ? ` (${p.idade} anos)` : ""}`)
      : ["• ninguém hoje"]),
    "",
    "*💰 Caixa*",
    `• Vencem hoje: ${vencemHoje.length} · ${formatarMoeda(somar(vencemHoje))}`,
    `• Atrasados: ${atrasados.length} · ${formatarMoeda(somar(atrasados))}`,
    ...atrasados.slice(0, 5).map(
      (t) =>
        `   – ${t.descricao || "Lançamento"}${
          motosDoCaixa[t.id] ? ` (${motosDoCaixa[t.id].nome})` : ""
        } · ${formatarMoeda(Number(t.valor) || 0)}`
    ),
    "",
    `*📄 Transferência há mais de ${DIAS_TRANSFERENCIA} dias (${vendas.length})*`,
    ...(vendas.length
      ? vendas.slice(0, 8).map(
          (v) =>
            `• ${nomeCurto(motoPorId.get(String(v.motorcycle_id)))} · ${
              v.cliente || "cliente"
            } · vendida há ${diasEntre(v.data_venda, hoje)} dias`
        )
      : ["• nenhuma atrasando"]),
    "",
    "*🏍️ Pátio*",
    `• ${disponiveis.length} motos disponíveis`,
    paradas.length
      ? `• ${paradas.length} paradas há mais de ${DIAS_PARADA} dias: ${paradas
          .slice(0, 5)
          .map((m) => `${nomeCurto(m)} (${m.dias} dias)`)
          .join(", ")}`
      : `• nenhuma parada há mais de ${DIAS_PARADA} dias`,
    "",
    "*📲 Site*",
    ...(pessoasOntem !== null ? [`• ${pessoasOntem} pessoas visitaram ontem`] : []),
    `• ${novosInteresse.length} novos na lista de interesse desde ontem`,
    ...(motoMaisVista
      ? [`• Mais vista na semana: ${motoMaisVista.nome} (${motoMaisVista.visitas} visitas)`]
      : []),
    "",
    "*📈 Mês até agora*",
    `• ${vendasMes.count ?? 0} motos vendidas · ${comprasMes.count ?? 0} compradas`,
  ];

  const texto = linhas.join("\n");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-dourado/20 bg-grafite p-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-dourado">
            <Sun size={15} />
            Resumo do dia
          </p>
          <h1 className="mt-1 text-2xl font-black capitalize text-white">
            {diaDaSemana}, {dia}/{mes}/{ano}
          </h1>
          <p className="mt-1 text-sm text-texto-suave">
            O que precisa de atenção hoje, de todas as telas juntas.
          </p>
        </div>

        <MandarResumo texto={texto} />
      </header>

      <Bloco icone={Cake} titulo="Aniversariantes hoje" quantos={aniversarios.hoje.length}>
        {aniversarios.hoje.length === 0 ? (
          <Vazio>Ninguém faz aniversário hoje.</Vazio>
        ) : (
          aniversarios.hoje.map((pessoa) => (
            <Linha key={pessoa.id}>
              <span>
                {pessoa.nome}
                {pessoa.idade ? (
                  <span className="text-texto-suave"> · {pessoa.idade} anos</span>
                ) : null}
              </span>
              <MandarParabens
                nome={pessoa.nome}
                telefone={pessoa.telefone}
                className="rounded-lg border border-emerald-400/40 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-400/10"
              >
                Parabenizar
              </MandarParabens>
            </Linha>
          ))
        )}
      </Bloco>

      <Bloco icone={Wallet} titulo="Caixa" link="/caixa" quantos={pendentes.length}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Numero rotulo="Vencem hoje" valor={formatarMoeda(somar(vencemHoje))} detalhe={`${vencemHoje.length} lançamentos`} />
          <Numero
            rotulo="Atrasados"
            valor={formatarMoeda(somar(atrasados))}
            detalhe={`${atrasados.length} lançamentos`}
            alerta={atrasados.length > 0}
          />
        </div>
        {[...atrasados, ...vencemHoje].slice(0, 10).map((t) => (
          <Linha key={t.id}>
            <span className="min-w-0">
              <span className="block truncate">{t.descricao || "Lançamento"}</span>
              <span className="text-xs text-texto-suave">
                {String(t.data).slice(0, 10) < hoje ? "atrasado" : "vence hoje"}
                {motosDoCaixa[t.id] ? ` · ${motosDoCaixa[t.id].nome}` : ""}
              </span>
            </span>
            <span className={`whitespace-nowrap font-bold ${t.tipo === "entrada" ? "text-green-400" : "text-red-400"}`}>
              {t.tipo === "entrada" ? "+" : "-"} {formatarMoeda(Number(t.valor) || 0)}
            </span>
          </Linha>
        ))}
      </Bloco>

      <Bloco
        icone={FileWarning}
        titulo={`Transferência há mais de ${DIAS_TRANSFERENCIA} dias`}
        quantos={vendas.length}
        link="/vendas"
      >
        {vendas.length === 0 ? (
          <Vazio>Nenhuma venda com a transferência atrasando.</Vazio>
        ) : (
          vendas.map((v) => {
            const dias = diasEntre(v.data_venda, hoje);
            return (
              <Linha key={v.id} href={`/vendas/${v.id}`}>
                <span className="min-w-0">
                  <span className="block truncate">
                    {nomeCurto(motoPorId.get(String(v.motorcycle_id)))}
                  </span>
                  <span className="text-xs text-texto-suave">{v.cliente || "cliente"}</span>
                </span>
                <span className={`whitespace-nowrap text-sm font-bold ${dias >= 30 ? "text-red-400" : "text-dourado"}`}>
                  {dias} dias
                </span>
              </Linha>
            );
          })
        )}
      </Bloco>

      <Bloco icone={Bike} titulo="Pátio" link="/admin/estoque" quantos={disponiveis.length}>
        <p className="text-sm text-texto-suave">
          {disponiveis.length} motos disponíveis ·{" "}
          {paradas.length
            ? `${paradas.length} paradas há mais de ${DIAS_PARADA} dias`
            : `nenhuma parada há mais de ${DIAS_PARADA} dias`}
        </p>
        {paradas.slice(0, 8).map((m) => (
          <Linha key={m.id} href={`/motos/${m.id}`}>
            <span className="truncate">{nomeCurto(m)}</span>
            <span className="whitespace-nowrap text-sm font-bold text-dourado">{m.dias} dias</span>
          </Linha>
        ))}
      </Bloco>

      <Bloco icone={Globe} titulo="Site" link="/interessados" quantos={novosInteresse.length}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Numero rotulo="Visitas ontem" valor={pessoasOntem !== null ? String(pessoasOntem) : "—"} detalhe="pessoas no site" />
          <Numero rotulo="Lista de interesse" valor={String(novosInteresse.length)} detalhe="novos desde ontem" />
          <Numero
            rotulo="Mais vista na semana"
            valor={motoMaisVista ? motoMaisVista.nome : "—"}
            detalhe={motoMaisVista ? `${motoMaisVista.visitas} visitas` : ""}
          />
        </div>
        {novosInteresse.slice(0, 6).map((p) => (
          <Linha key={p.id} href="/interessados">
            <span className="truncate">{p.nome}</span>
            <span className="truncate text-xs text-texto-suave">{p.procura || ""}</span>
          </Linha>
        ))}
      </Bloco>

      <Bloco icone={TrendingUp} titulo="Mês até agora" link="/relatorios">
        <div className="grid gap-3 sm:grid-cols-2">
          <Numero rotulo="Motos vendidas" valor={String(vendasMes.count ?? 0)} />
          <Numero rotulo="Motos compradas" valor={String(comprasMes.count ?? 0)} />
        </div>
      </Bloco>
    </div>
  );
}

function Bloco({
  icone: Icone,
  titulo,
  quantos,
  link,
  children,
}: {
  icone: LucideIcon;
  titulo: string;
  quantos?: number;
  link?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-grafite-claro bg-grafite p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold text-white">
          <Icone size={18} className="text-dourado" />
          {titulo}
          {quantos !== undefined && (
            <span className="rounded-full bg-dourado/15 px-2 py-0.5 text-xs font-black text-dourado">
              {quantos}
            </span>
          )}
        </h2>
        {link && (
          <Link href={link} className="text-xs font-bold text-texto-suave hover:text-dourado">
            abrir →
          </Link>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Linha({ href, children }: { href?: string; children: React.ReactNode }) {
  const classe =
    "flex items-center justify-between gap-3 rounded-xl border border-grafite-claro bg-preto px-4 py-2.5 text-sm text-texto";
  return href ? (
    <Link href={href} className={`${classe} transition hover:border-dourado/60`}>
      {children}
    </Link>
  ) : (
    <div className={classe}>{children}</div>
  );
}

function Numero({
  rotulo,
  valor,
  detalhe,
  alerta,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-xl border border-grafite-claro bg-preto p-4">
      <p className="text-xs text-texto-suave">{rotulo}</p>
      <p className={`mt-1 truncate text-lg font-bold ${alerta ? "text-red-400" : "text-white"}`}>{valor}</p>
      {detalhe ? <p className="text-xs text-texto-suave">{detalhe}</p> : null}
    </div>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-texto-suave">{children}</p>;
}
