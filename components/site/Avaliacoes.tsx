import { ArrowRight, Star } from "lucide-react";
import { GOOGLE, LOJA } from "@/lib/dados/loja";
import { avaliacoesDoGoogle } from "@/lib/dados/avaliacoes-google";

/*
 * As avaliações do Google.
 *
 * Quando a API responde, os comentários reais aparecem aqui,
 * com o nome de quem escreveu e o link para a avaliação no
 * Google - que é o que a licença do Google exige: mostrar de
 * onde veio e deixar chegar na origem.
 *
 * O texto não promete imparcialidade nem explica como as
 * avaliações são escolhidas: quem lê no Google já sabe que a
 * loja não controla aquilo, e falar disso levanta uma dúvida
 * que ninguém tinha.
 *
 * Quando não responde - chave faltando, API desligada, Google
 * fora do ar -, a seção continua no lugar com os dois botões.
 * Site no ar vale mais que avaliação na tela.
 *
 * O segundo botão é tão importante quanto o primeiro: quem
 * acabou de comprar e está feliz raramente lembra de avaliar,
 * mas avalia se o caminho estiver a um toque.
 */

function Estrelas({
  nota,
  tamanho = 20,
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
              ? "texto-ouro"
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
    <section className="border-y border-white/[.07] bg-[#0d0d10]">
      <div className="mx-auto max-w-6xl px-4 py-14 lg:py-16">
        <div className="text-center">
          <Estrelas nota={nota ?? 5} />

          {nota !== null && (
            <p className="mt-3 text-3xl font-black texto-claro">
              {nota.toFixed(1).replace(".", ",")}

              {total !== null && (
                <span className="ml-2 align-middle text-sm font-semibold texto-suave">
                  · {total} avaliações no Google
                </span>
              )}
            </p>
          )}

          <h2 className="mt-4 text-2xl font-black uppercase leading-tight texto-claro sm:text-3xl">
            O que dizem{" "}
            <span className="texto-ouro">sobre a gente</span>
          </h2>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 texto-suave">
            A confiança de quem já comprou é o que nos move.
            Veja no Google a experiência de quem passou pela{" "}
            {LOJA.nome}.
          </p>
        </div>

        {comentarios.length > 0 && (
          <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {comentarios.slice(0, 3).map((item) => (
              <li
                key={`${item.autor}-${item.quando}`}
                className="cartao-3d flex flex-col rounded-2xl p-5"
              >
                <Estrelas nota={item.nota} tamanho={15} />

                <p className="mt-3 flex-1 text-sm leading-6 texto-suave">
                  {item.texto.length > 260
                    ? `${item.texto.slice(0, 260).trim()}...`
                    : item.texto}
                </p>

                <div className="mt-4 flex items-center gap-3 border-t border-white/[.07] pt-4">
                  {item.foto && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.foto}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  )}

                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold texto-claro">
                      {item.autor}
                    </span>

                    {item.quando && (
                      <span className="block text-xs texto-suave">
                        {item.quando}
                      </span>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href={GOOGLE.perfil}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-ouro flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-bold"
          >
            {comentarios.length > 0
              ? "Ver todas no Google"
              : "Ver avaliações no Google"}
            <ArrowRight size={15} />
          </a>

          <a
            href={GOOGLE.avaliar}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-vidro flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-bold"
          >
            <Star size={15} />
            Avaliar a loja
          </a>
        </div>
      </div>
    </section>
  );
}
