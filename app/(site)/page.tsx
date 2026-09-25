import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { estoqueDoSite } from "@/lib/dados/estoque-site";
import { modelosDoEstoque } from "@/lib/dados/moto-site";
import {
  CONVITE_GERAL,
  ENDERECO_COMPLETO,
  HORARIOS,
  LOJA,
  linkWhatsApp,
} from "@/lib/dados/loja";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import VitrineCartaz from "@/components/site/VitrineCartaz";
import AvisarNovidades from "@/components/site/AvisarNovidades";
import Avaliacoes from "@/components/site/Avaliacoes";

/*
 * A capa do site.
 *
 * Em vez de seções iguais empilhadas, cada bloco tem um ritmo
 * próprio: a letra de cartaz manda na manchete, o preço tem
 * corpo de titulo e o fundo tem grão, porque preto liso é tela
 * de sistema.
 *
 * Moto aparece uma vez só: um card, as destaques passando
 * sozinhas dentro dele. Duas fotos na primeira tela disputavam
 * entre si e ninguém sabia para onde olhar.
 *
 * Cabeçalho, rodapé, contador de acessos e aviso de cookies
 * vêm da moldura do site, em layout.tsx - esta página é só o
 * miolo.
 */

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { motos, fotos, slugs } = await estoqueDoSite();

  /*
   * Quem manda na capa é a marcação da ficha. Sem nenhuma
   * marcada, valem as quatro que entraram por último - assim
   * a capa nunca fica vazia por esquecimento.
   */
  const escolhidas = motos.filter((moto) => moto.na_capa);

  const destaques =
    escolhidas.length > 0
      ? escolhidas.slice(0, 6)
      : motos.slice(0, 4);

  return (
    <main className="novo relative overflow-hidden">
      {/* ---------------- CAPA ---------------- */}

      <section className="grao relative">
        <span
          className="brasa"
          style={{ top: "-14rem", right: "-10rem" }}
        />

        <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-6 lg:pb-24">
          <div className="sobe relative z-10">
            <p className="rotulo">{LOJA.cidade}</p>

            <h1 className="cartaz mt-5 text-[clamp(3.2rem,11vw,7.5rem)] claro">
              Moto que
              <br />
              <span className="ouro">aguenta</span> o dia
              <br />
              a dia
            </h1>

            <div className="risco mt-7 w-40" />

            {/*
              * "Documentação resolvida pela loja" dava a
              * entender que a loja paga a transferência, e
              * ela não paga. O que a loja faz é conduzir: dar
              * entrada, acompanhar e entregar a moto no nome
              * do cliente. É isso que a frase diz agora -
              * promessa que a loja não cumpre custa caro na
              * hora de fechar.
              */}
            <p className="mt-6 max-w-md text-[1.05rem] leading-8 suave">
              {motos.length} motos revisadas, com procedência
              conferida e débitos checados. Você escolhe a
              moto; a transferência quem conduz é a loja, do
              começo ao fim.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-7">
              <a
                href={linkWhatsApp(CONVITE_GERAL)}
                target="_blank"
                rel="noopener noreferrer"
                className="botao inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm"
              >
                <IconeWhatsApp className="h-4 w-4" />
                Falar agora
              </a>

              <Link
                href="/estoque"
                className="botao-linha inline-flex items-center gap-1.5 pb-1 text-sm"
              >
                Ver as {motos.length} motos
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>

          {/*
            * No celular a vitrine vem antes do texto: quem
            * abre site de loja quer ver moto, não ler.
            */}
          {destaques.length > 0 && (
            <div className="sobe order-first lg:order-none">
              <VitrineCartaz
                motos={destaques}
                slugs={slugs}
                capas={fotos.capas}
              />
            </div>
          )}
        </div>
      </section>

      {/* ---------------- O QUE A LOJA FAZ ---------------- */}

      <section className="grao relative border-y border-white/10 bg-[#0c0c0f]">
        <span
          className="brasa"
          style={{ bottom: "-20rem", left: "-14rem" }}
        />

        <div className="relative mx-auto max-w-[1400px] px-5 py-20 sm:px-8">
          <p className="rotulo">Antes de ir para a vitrine</p>

          <div className="mt-10 grid gap-x-10 gap-y-12 md:grid-cols-3">
            {[
              {
                titulo: "Cautelar",
                texto:
                  "Perícia feita antes da compra. Moto com apontamento não entra no pátio.",
              },
              {
                titulo: "Revisão",
                texto:
                  "O que precisa de reparo é resolvido aqui, antes de a moto ser anunciada.",
              },
              {
                titulo: "Documentação",
                texto:
                  "Débitos conferidos e transferência conduzida pela loja, do começo ao fim.",
              },
            ].map((item, i) => (
              <div
                key={item.titulo}
                className="cartao-relevo p-7"
              >
                <span className="numero">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <h3 className="cartaz mt-4 text-[1.6rem] claro">
                  {item.titulo}
                </h3>

                <div className="risco mt-3 w-16" />

                <p className="mt-4 text-[1rem] leading-7 suave">
                  {item.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- LISTA DE AVISO ---------------- */}

      <AvisarNovidades
        origem="home"
        sugestoes={modelosDoEstoque(motos)}
      />

      {/* ---------------- QUEM JÁ COMPROU ---------------- */}

      <Avaliacoes />

      {/* ---------------- CHAMADA ---------------- */}

      <section className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <h2 className="cartaz text-[clamp(2.4rem,7vw,5rem)] claro">
              Passa aqui.
              <br />
              <span className="ouro">Sem compromisso.</span>
            </h2>

            <div className="risco mt-7 w-40" />
          </div>

          <div className="text-[1rem] leading-8 suave">
            <p className="claro">{ENDERECO_COMPLETO}</p>

            <dl className="mt-5 space-y-1">
              {HORARIOS.map((item) => (
                <div
                  key={item.texto}
                  className="flex justify-between gap-6 border-b border-white/[.07] py-1.5"
                >
                  <dt>{item.texto}</dt>
                  <dd className="claro">{item.horas}</dd>
                </div>
              ))}
            </dl>

            <a
              href={linkWhatsApp(CONVITE_GERAL)}
              target="_blank"
              rel="noopener noreferrer"
              className="botao mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm"
            >
              <IconeWhatsApp className="h-4 w-4" />
              {LOJA.whatsappExibicao}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
