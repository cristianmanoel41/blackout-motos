import {
  MessageCircle,
  Megaphone,
  MousePointerClick,
  Wallet,
} from "lucide-react";
import {
  anunciosDoMeta,
  type Resultado,
} from "@/lib/dados/anuncios-meta";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import styles from "./dashboard.module.css";

/*
 * O resultado do anúncio, junto do resto da loja.
 *
 * O número que decide é o custo por conversa: com ele dá para
 * comparar campanha com campanha, e semana com semana, sem
 * depender de sensação. Gasto sozinho não diz nada - R$ 800 é
 * caro ou barato conforme quantas conversas trouxe.
 */

function Linha({
  titulo,
  dados,
}: {
  titulo: string;
  dados: Resultado | null;
}) {
  const inteiro = (valor: number) =>
    new Intl.NumberFormat("pt-BR").format(valor);

  return (
    <div className={styles.miniCard}>
      <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
        {titulo}
      </p>

      {!dados ? (
        <p className="mt-2 text-lg font-black text-black">—</p>
      ) : (
        <>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-black text-black">
              {dados.porConversa === null
                ? "—"
                : formatarMoeda(dados.porConversa)}
            </span>

            <span className="text-[11px] font-bold text-black/45">
              por conversa
            </span>
          </p>

          <div className="mt-2 space-y-1 text-[11px] font-bold text-black/45">
            <p className="flex items-center gap-1.5">
              <Wallet size={12} />
              {formatarMoeda(dados.gasto)} gastos
            </p>

            <p className="flex items-center gap-1.5">
              <MessageCircle size={12} />
              {inteiro(dados.conversas)} conversa
              {dados.conversas === 1 ? "" : "s"}
            </p>

            <p className="flex items-center gap-1.5">
              <MousePointerClick size={12} />
              {inteiro(dados.cliques)} cliques ·{" "}
              {inteiro(dados.alcance)} pessoas
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default async function AnunciosMeta() {
  const anuncios = await anunciosDoMeta();

  return (
    <div className={styles.panel}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-black">
            Anúncios no Meta
          </h2>

          <p className="text-xs font-bold text-black/45">
            Quanto custou cada conversa no WhatsApp
          </p>
        </div>

        <span
          className={`${styles.dataPill} flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-black/65`}
        >
          <Megaphone size={14} className="text-[#a97800]" />
          Facebook e Instagram
        </span>
      </div>

      {!anuncios.configurado ? (
        <p className="text-sm font-semibold leading-6 text-black/55">
          Falta ligar a leitura. No Gerenciador de Anúncios,
          copie o ID da conta (formato act_123456789) e gere um
          token de acesso. Guarde os dois como
          META_AD_ACCOUNT_ID e META_ACCESS_TOKEN — o token é
          senha, então cole direto na Vercel.
        </p>
      ) : anuncios.erro ? (
        <p className="text-sm font-semibold leading-6 text-black/55">
          O Meta recusou a consulta: {anuncios.erro}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Linha titulo="Hoje" dados={anuncios.hoje} />
          <Linha titulo="7 dias" dados={anuncios.semana} />
          <Linha titulo="30 dias" dados={anuncios.mes} />
        </div>
      )}
    </div>
  );
}
