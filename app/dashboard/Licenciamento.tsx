import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Dobravel from "@/components/Dobravel";
import {
  anoParaConferir,
  dataCurta,
  situacaoDoLicenciamento,
  type SituacaoLicenciamento,
} from "@/lib/dados/licenciamento-sp";
import MarcarLicenciado from "./MarcarLicenciado";
import styles from "./dashboard.module.css";

/*
 * O LICENCIAMENTO DAS MOTOS DO PÁTIO
 *
 * Pega o final da placa de cada moto que ainda não foi vendida,
 * cruza com o calendário do Detran-SP (lib/dados/licenciamento-sp)
 * e avisa quais precisam ser conferidas: as vencidas primeiro,
 * depois as que vencem neste mês e, como antecedência, as do mês
 * que vem.
 *
 * Moto vendida sai da lista: o licenciamento passa a ser do
 * cliente. Moto que entrou no pátio depois do vencimento aparece
 * como vencida - é exatamente a que o dono anterior pode ter
 * deixado sem pagar.
 *
 * O "Conferido" grava o ano na moto (migration 0043) e o aviso
 * some até o vencimento do ano seguinte.
 */

type Linha = {
  id: string;
  nome: string;
  placa: string;
  situacao: SituacaoLicenciamento;
  conferidoAno: number | null;
  conferidoEm: string | null;
};

/* Conferidas nos últimos dias ficam à mão para desfazer um clique sem querer. */
const DIAS_PARA_DESFAZER = 7;

function inicioDaJanela() {
  return Date.now() - DIAS_PARA_DESFAZER * 24 * 60 * 60 * 1000;
}

const ORDEM = { vencido: 0, "vence-este-mes": 1, "vence-mes-que-vem": 2 } as const;

function Etiqueta({ situacao }: { situacao: SituacaoLicenciamento }) {
  if (!("vencimento" in situacao)) return null;

  const data = dataCurta(situacao.vencimento);
  const [texto, cor] =
    situacao.tipo === "vencido"
      ? [`venceu em ${data}`, "border-red-400/50 text-red-400"]
      : situacao.tipo === "vence-este-mes"
        ? [`vence em ${data}`, "border-amber-400/60 text-amber-400"]
        : [`vence em ${data}`, "border-white/15 text-black/55"];

  return (
    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-black ${cor}`}>
      {texto}
    </span>
  );
}

export default async function Licenciamento() {
  const supabase = await createClient();

  let semColuna = false;

  let resposta = await supabase
    .from("motorcycles")
    .select("id, marca, modelo, versao, ano_modelo, placa, status, licenciamento_conferido_ano, licenciamento_conferido_em")
    .neq("status", "vendida");

  /* Antes de rodar a migration 0043 a coluna não existe: avisa sem o botão. */
  if (resposta.error) {
    semColuna = true;
    resposta = (await supabase
      .from("motorcycles")
      .select("id, marca, modelo, versao, ano_modelo, placa, status")
      .neq("status", "vendida")) as typeof resposta;
  }

  if (resposta.error) return null;

  const motos = resposta.data || [];

  const linhas: Linha[] = motos.map((moto) => {
    const conferencia = moto as {
      licenciamento_conferido_ano?: number | null;
      licenciamento_conferido_em?: string | null;
    };
    const conferidoAno = semColuna ? null : Number(conferencia.licenciamento_conferido_ano) || null;

    return {
    id: String(moto.id),
    nome:
      [moto.marca, moto.modelo, moto.versao, moto.ano_modelo]
        .map((parte) => String(parte || "").trim())
        .filter(Boolean)
        .join(" ") || "Moto",
    placa: String(moto.placa || "").toUpperCase(),
    situacao: situacaoDoLicenciamento(moto.placa, conferidoAno),
    conferidoAno,
    conferidoEm: semColuna ? null : conferencia.licenciamento_conferido_em || null,
    };
  });

  const avisos = linhas
    .filter((l) => "vencimento" in l.situacao)
    .sort((a, b) => {
      const sa = a.situacao as Extract<SituacaoLicenciamento, { vencimento: Date }>;
      const sb = b.situacao as Extract<SituacaoLicenciamento, { vencimento: Date }>;
      return ORDEM[sa.tipo] - ORDEM[sb.tipo] || sa.vencimento.getTime() - sb.vencimento.getTime();
    });

  const urgentes = avisos.filter((l) => l.situacao.tipo !== "vence-mes-que-vem").length;
  const semPlaca = linhas.filter((l) => l.situacao.tipo === "sem-placa");

  const limite = inicioDaJanela();
  const conferidasAgora = linhas
    .filter((l) => l.conferidoEm && new Date(l.conferidoEm).getTime() >= limite)
    .sort((a, b) => String(b.conferidoEm).localeCompare(String(a.conferidoEm)));

  return (
    <div className={styles.panel}>
      {/*
        * Abre e fecha pelo título (pedido de 18/11/2026). Fechado,
        * a contagem continua ao lado do título para o aviso não
        * sumir junto com a lista; a escolha fica guardada no
        * navegador, como nos outros blocos do painel.
        */}
      <Dobravel
        titulo="Licenciamento"
        subtitulo="Pelo final da placa, no calendário do Detran-SP · motos do pátio"
        nome="licenciamento"
        padrao
        grande
        icone={<FileCheck2 size={17} className="text-[#a97800]" />}
        detalhe={urgentes > 0 ? `${urgentes} para conferir` : "nada vencendo agora"}
      >

      {semColuna && (
        <p className="mb-3 rounded-xl border border-amber-400/40 px-3 py-2 text-[12px] font-bold text-amber-400">
          Para o botão &quot;Conferido&quot; funcionar, rode o arquivo
          supabase/migrations/0043_licenciamento_conferido.sql no SQL Editor do Supabase.
        </p>
      )}

      {avisos.length > 0 ? (
        <div className="space-y-1">
          {avisos.map((linha) => (
            <div
              key={linha.id}
              className={`flex flex-wrap items-center gap-3 rounded-xl px-3 py-2.5 ${
                linha.situacao.tipo === "vencido" ? styles.goldPanel : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/motos/${linha.id}`}
                  className="block truncate text-sm font-black text-black hover:underline"
                >
                  {linha.nome}
                </Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-bold text-black/45">
                  <span>
                    {linha.placa} · final {"final" in linha.situacao ? linha.situacao.final : ""} ·
                    licenciamento {"ano" in linha.situacao ? linha.situacao.ano : ""}
                  </span>
                  <Etiqueta situacao={linha.situacao} />
                </p>
              </div>

              {!semColuna && (
                <MarcarLicenciado
                  motoId={linha.id}
                  ano={anoParaConferir(linha.situacao) || new Date().getFullYear()}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm font-semibold leading-6 text-black/55">
          Todas as motos do pátio estão com o licenciamento conferido para o prazo atual.
        </p>
      )}

      {conferidasAgora.length > 0 && (
        <details className="mt-3 border-t border-white/10 pt-3">
          <summary className="cursor-pointer text-[11px] font-bold text-black/45">
            {conferidasAgora.length === 1
              ? "1 moto conferida nos últimos 7 dias"
              : `${conferidasAgora.length} motos conferidas nos últimos 7 dias`}{" "}
            (clicou sem querer? volte ela para a lista)
          </summary>
          <div className="mt-2 space-y-1">
            {conferidasAgora.map((linha) => (
              <div key={linha.id} className="flex flex-wrap items-center gap-3 rounded-xl px-3 py-1.5">
                <p className="min-w-0 flex-1 truncate text-[12px] font-bold text-black/60">
                  {linha.nome} · {linha.placa} · conferido {linha.conferidoAno} em{" "}
                  {new Date(String(linha.conferidoEm)).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </p>
                <MarcarLicenciado motoId={linha.id} ano={linha.conferidoAno || 0} desfazer />
              </div>
            ))}
          </div>
        </details>
      )}

      <a
        href="https://www.detran.sp.gov.br/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block border-t border-white/10 pt-3 text-[11px] font-bold text-black/40 transition hover:text-[#f0c640]"
      >
        Consultar no site do Detran-SP (placa + RENAVAM) →
      </a>

      {semPlaca.length > 0 && (
        <p className="mt-2 text-[11px] font-bold text-black/40">
          {semPlaca.length === 1
            ? "1 moto está sem placa no cadastro e não entra no aviso"
            : `${semPlaca.length} motos estão sem placa no cadastro e não entram no aviso`}
          : {semPlaca.map((l) => l.nome).join(", ")}.
        </p>
      )}
      </Dobravel>
    </div>
  );
}
