"use client";

import { useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";

/*
 * Um pedaço de painel que abre e fecha.
 *
 * O bloco de acessos ficou alto demais: três cartões, dois
 * rankings e dois gráficos, tudo sempre aberto, empurrando o
 * resto do painel para baixo. Aqui cada parte vira um título
 * com seta, e quem olha decide o que quer ver.
 *
 * A escolha fica guardada no navegador de quem usa, por bloco.
 * Não adianta dobrar o gráfico hoje e ele voltar aberto amanhã
 * - seria uma tela grande de novo, com trabalho a mais.
 *
 * O conteúdo só existe quando está aberto. Dois motivos: o
 * gráfico precisa de largura para se desenhar, e largura zero
 * é o que ele teria dentro de um bloco escondido; e o que está
 * fechado não custa nada para montar.
 */

function chave(nome: string) {
  return `blackout-painel-${nome}`;
}

/*
 * Quem está olhando esta escolha agora.
 *
 * O jeito de ler armazenamento do navegador sem quebrar a
 * montagem da página no servidor é este: o servidor entrega o
 * padrão, e o navegador troca pela escolha guardada já na
 * primeira passada. Ler dentro de um efeito, que seria o
 * caminho óbvio, é justamente o que o React desaconselha e o
 * que o lint deste projeto recusa.
 */
const ouvintes = new Set<() => void>();

function avisarTodos() {
  ouvintes.forEach((avisar) => avisar());
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar);

  return () => {
    ouvintes.delete(avisar);
  };
}

function ler(nome: string, padrao: boolean) {
  try {
    const guardado = localStorage.getItem(chave(nome));

    if (guardado === null) return padrao;

    return guardado === "sim";
  } catch {
    /* Navegador com armazenamento bloqueado: vale o padrão. */
    return padrao;
  }
}

function guardar(nome: string, aberto: boolean) {
  try {
    localStorage.setItem(chave(nome), aberto ? "sim" : "nao");
  } catch {
    /* Sem armazenamento, a escolha vale só nesta visita. */
  }

  avisarTodos();
}

export default function Dobravel({
  titulo,
  detalhe,
  subtitulo,
  nome,
  padrao = false,
  grande = false,
  icone,
  aoLado,
  children,
}: {
  titulo: string;
  /* A letrinha ao lado do título: "— 30 dias". */
  detalhe?: string;
  /* A linha explicativa embaixo do título, nos painéis. */
  subtitulo?: string;
  /* Como esta escolha é guardada. Único por bloco. */
  nome: string;
  /* Se nasce aberto, enquanto ninguém escolheu. */
  padrao?: boolean;
  /*
   * Cabeçalho de painel inteiro, e não de pedaço dele.
   *
   * O painel do dashboard usa título grande com subtítulo; os
   * blocos de dentro de um painel usam título pequeno. É a
   * mesma peça nos dois lugares, com dois tamanhos.
   */
  grande?: boolean;
  icone?: React.ReactNode;
  /* O que fica à direita do título - a etiqueta de período. */
  aoLado?: React.ReactNode;
  children: React.ReactNode;
}) {
  const aberto = useSyncExternalStore(
    assinar,
    () => ler(nome, padrao),
    () => padrao
  );

  return (
    <section>
      <button
        type="button"
        onClick={() => guardar(nome, !aberto)}
        aria-expanded={aberto}
        className={`flex w-full flex-wrap items-center gap-x-3 gap-y-2 text-left ${
          aberto ? (grande ? "mb-5" : "mb-2") : ""
        }`}
      >
        {icone}

        <div className="min-w-0">
          {grande ? (
            <h2 className="text-lg font-black text-black">
              {titulo}
            </h2>
          ) : (
            <h3 className="text-sm font-black text-black">
              {titulo}
            </h3>
          )}

          {subtitulo && (
            <p className="text-xs font-bold text-black/45">
              {subtitulo}
            </p>
          )}
        </div>

        {detalhe && (
          <span className="text-[11px] font-bold text-black/40">
            {detalhe}
          </span>
        )}

        <span className="ml-auto flex items-center gap-3">
          {/* A etiqueta de periodo so aparece com o bloco
              aberto: fechado, ela fala de algo que nao esta
              na tela. */}
          {aberto && aoLado}

          <span className="flex items-center gap-1.5 text-[11px] font-bold text-black/40">
            {aberto ? "ocultar" : "ver"}
            <ChevronDown
              size={16}
              className={`transition-transform ${
                aberto ? "rotate-180" : ""
              }`}
            />
          </span>
        </span>
      </button>

      {aberto && children}
    </section>
  );
}
