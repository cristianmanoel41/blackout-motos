import { ArrowUpRight, Quote, Star } from "lucide-react";
import { GOOGLE, LOJA } from "@/lib/dados/loja";
import { avaliacoesDoGoogle } from "@/lib/dados/avaliacoes-google";
import Carrossel from "@/components/v2/Carrossel";
import AoEntrar from "@/components/v2/AoEntrar";

/*
 * O que os clientes dizem.
 *
 * Os comentários vêm do Google pela API, com o nome de quem
 * escreveu e o link para a avaliação lá - que é o que a
 * licença exige: mostrar de onde veio e deixar chegar na
 * origem. A resposta fica em cache por 24 horas no módulo que
 * busca, então visita nenhuma vira cobrança.
 *
 * Quando a chave falta, a API está desligada ou o Google não
 * responde, a seção continua no lugar com os dois botões. Site
 * no ar vale mais que avaliação na tela - e nada aqui inventa
 * nota nem comentário.
 *
 * O segundo botão importa tanto quanto o primeiro: quem acabou
 * de comprar e está feliz raramente lembra de avaliar, mas
 * avalia se o caminho estiver a um toque.
 */

function Estrelas({
  nota,
  tamanho = 18,
}: {
  nota: number;
  tamanho?: number;
}) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((posicao) => (
        <Star
          key={posicao}
          size={tamanho}
          className={
            posicao <= Math.round(nota)
              ? "ouro"
              : "text-white/15"
          }
          fill="currentColor"
        />
      ))}
    </span>
  );
}

export default async function Avaliacoes() {
  const google = await avaliacoesDoGoogle();

  const nota = google?.nota ?? null;
  const total = google?.total ?? null;
  const comentarios = google?.avaliacoes ?? [];

  return (
    <section className="grao relative border-y border-white/[.07] bg-[#0c0c10]">
      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-20">
        <AoEntrar className="text-center">
          <span className="flex justify-center">
            <Estrelas nota={nota ?? 5} tamanho={22} />
          </span>

          {nota !== null && (
            <p className="titulo mt-4 text-[2.2rem] claro">
              {nota.toFixed(1).replace(".", ",")}

              {total !== null && (
                <span className="ml-2 align-middle text-sm font-semibold suave">
                  · {total} avaliações no Google
                </span>
              )}
            </p>
          )}

          <h2 className="titulo mt-4 text-[clamp(1.9rem,4.5vw,2.8rem)] claro">
            O que nossos clientes{" "}
            <span className="ouro">dizem</span>
          </h2>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 suave">
            A confiança de quem já comprou é o que nos move.
            Veja no Google a experiência de quem passou pela{" "}
            {LOJA.nome}.
          </p>
        </AoEntrar>

        {comentarios.length > 0 && (
          <div className="mt-10">
            <Carrossel
              rotulo="Avaliações no Google"
              tempo={7000}
            >
              {comentarios.map((item) => (
                <div
                  key={`${item.autor}-${item.quando}`}
                  className="w-[84%] sm:w-[48%] lg:w-[32%]"
                >
                  <article className="vidro flex h-full flex-col p-6">
                    <Quote
                      size={22}
                      className="ouro"
                      aria-hidden="true"
                    />

                    <p className="mt-3 line-clamp-6 text-[14px] leading-7 claro">
                      {item.texto}
                    </p>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[.07] pt-4">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold claro">
                          {item.autor}
                        </p>
                        <p className="text-[12px] suave">
                          {item.quando}
                        </p>
                      </div>

                      <Estrelas
                        nota={item.nota}
                        tamanho={14}
                      />
                    </div>
                  </article>
                </div>
              ))}
            </Carrossel>
          </div>
        )}

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={GOOGLE.perfil}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-ouro inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm"
          >
            Ver avaliações no Google
            <ArrowUpRight size={16} />
          </a>

          <a
            href={GOOGLE.avaliar}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-vidro inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm"
          >
            <Star size={15} />
            Avaliar a loja
          </a>
        </div>
      </div>
    </section>
  );
}
