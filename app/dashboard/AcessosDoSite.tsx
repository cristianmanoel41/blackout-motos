import { Eye, Globe, Users } from "lucide-react";
import { acessosDoSite, type Contagem } from "@/lib/dados/acessos-site";
import styles from "./dashboard.module.css";

/*
 * Quanta gente entrou no site, dentro do painel da loja.
 *
 * Três janelas: hoje, sete dias e trinta dias. "Visitantes" é
 * gente; "páginas" é página aberta - quem vê cinco motos conta
 * como uma pessoa e seis páginas. Os dois juntos dizem se o
 * site está trazendo gente nova ou se quem entra está mesmo
 * olhando moto.
 *
 * O sistema da loja fica fora dessa conta: a medição só roda
 * no site público.
 */

function Numero({
  titulo,
  quando,
  dados,
}: {
  titulo: string;
  quando: string;
  dados: Contagem | null;
}) {
  return (
    <div className={styles.miniCard}>
      <div className="flex items-center gap-3">
        <div className={styles.icon3d}>
          <Users size={20} />
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
            {titulo}
          </p>

          <p className="mt-1 text-lg font-black text-black">
            {dados
              ? new Intl.NumberFormat("pt-BR").format(
                  dados.visitantes
                )
              : "—"}
          </p>

          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-black/45">
            <Eye size={12} />
            {dados
              ? `${new Intl.NumberFormat("pt-BR").format(
                  dados.paginas
                )} páginas · ${quando}`
              : quando}
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function AcessosDoSite() {
  const acessos = await acessosDoSite();

  return (
    <div className={styles.panel}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-black">
            Acessos ao site
          </h2>

          <p className="text-xs font-bold text-black/45">
            Quantas pessoas entraram em blackoutmotos.com.br
          </p>
        </div>

        <span
          className={`${styles.dataPill} flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-black/65`}
        >
          <Globe size={14} className="text-[#a97800]" />
          Só o site
        </span>
      </div>

      {!acessos.configurado ? (
        <p className="text-sm font-semibold leading-6 text-black/55">
          Falta ligar a leitura. Na Vercel: crie um token em
          Account Settings → Tokens e copie o Project ID em
          Settings → General do projeto. Depois guarde os dois
          como VERCEL_TOKEN e VERCEL_PROJECT_ID, sem passar por
          e-mail nem conversa - token é senha.
        </p>
      ) : acessos.erro ? (
        <p className="text-sm font-semibold leading-6 text-black/55">
          Não deu para ler os acessos agora. Os números
          continuam sendo contados; é só a leitura que falhou.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Numero
            titulo="Hoje"
            quando="desde a meia-noite"
            dados={acessos.hoje}
          />

          <Numero
            titulo="7 dias"
            quando="na semana"
            dados={acessos.semana}
          />

          <Numero
            titulo="30 dias"
            quando="no mês"
            dados={acessos.mes}
          />
        </div>
      )}
    </div>
  );
}
