"use client";

import { useState } from "react";
import { BellRing, Check } from "lucide-react";
import { rastrear } from "@/components/site/Pixel";

/*
 * Cadastro para ser avisado quando chega moto nova.
 *
 * Dois campos e pronto. Cada campo a mais derruba o número de
 * cadastros, e o resto a loja pergunta na conversa - o que
 * importa aqui é ter como chamar a pessoa quando a moto certa
 * aparecer.
 *
 * O aviso sobre o WhatsApp fica escrito antes do botão: a
 * pessoa precisa saber por onde vai ser chamada antes de
 * deixar o telefone.
 */

function mascaraTelefone(valor: string) {
  const n = valor.replace(/\D/g, "").slice(0, 11);

  if (n.length <= 2) return n;

  if (n.length <= 6) {
    return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  }

  /* Celular tem 9 dígitos depois do DDD; fixo tem 8. */
  const corte = n.length > 10 ? 7 : 6;

  return `(${n.slice(0, 2)}) ${n.slice(2, corte)}-${n.slice(corte)}`;
}

export default function AvisarNovidades({
  origem = "site",
  sugestoes = [],
}: {
  origem?: string;
  sugestoes?: string[];
}) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [procura, setProcura] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();

    setErro("");

    if (nome.trim().length < 2) {
      setErro("Escreva o seu nome.");
      return;
    }

    if (telefone.replace(/\D/g, "").length < 10) {
      setErro("Informe o telefone com DDD.");
      return;
    }

    setEnviando(true);

    try {
      const resposta = await fetch("/api/interesse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          telefone,
          procura,
          origem,
        }),
      });

      const dados = await resposta.json().catch(() => null);

      /*
       * Sem o "ok" do servidor não vale: um desvio no caminho
       * devolve página em vez de resposta, e a pessoa sairia
       * achando que entrou na lista sem ter entrado.
       */
      if (!resposta.ok || dados?.ok !== true) {
        throw new Error(dados?.error || "Não foi possível cadastrar.");
      }

      /*
       * Cadastro na lista e o evento mais valioso do site:
       * e dele que o Meta aprende quem vale perseguir.
       */
      rastrear("Lead", {
        content_name: procura.trim() || "moto nova",
      });

      setPronto(true);
    } catch (e: any) {
      setErro(e?.message || "Não foi possível cadastrar agora.");
    } finally {
      setEnviando(false);
    }
  }

  const campo = "w-full rounded-xl border px-4 py-3 text-sm outline-none";

  if (pronto) {
    return (
      <section className="border-y border-white/[.07] bg-[#0d0d10]">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e0b129]/10 ring-1 ring-[#e0b129]/25">
            <Check size={26} className="texto-ouro" />
          </span>

          <h2 className="mt-5 text-2xl font-black uppercase texto-claro">
            Pronto, {nome.trim().split(" ")[0]}!
          </h2>

          <p className="mx-auto mt-3 max-w-md text-sm leading-7 texto-suave">
            {procura.trim()
              ? `Anotamos que você procura ${procura.trim()}. Assim que chegar uma assim, a gente chama você no WhatsApp antes de anunciar.`
              : "Você entrou na nossa lista. Quando chegar moto nova, a gente chama você no WhatsApp antes de anunciar."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-y border-white/[.07] bg-[#0d0d10]">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e0b129]/10 ring-1 ring-[#e0b129]/25">
            <BellRing size={22} className="texto-ouro" />
          </span>

          <h2 className="mt-5 text-2xl font-black uppercase leading-tight texto-claro sm:text-3xl">
            {/*
             * No estoque a pergunta cabe: a pessoa acabou de
             * procurar. Na home ela ainda não procurou nada, e
             * perguntar se não achou soaria estranho.
             */}
            {origem === "estoque" ? (
              <>
                Não achou a moto{" "}
                <span className="texto-ouro">certa?</span>
              </>
            ) : (
              <>
                Saiba antes de{" "}
                <span className="texto-ouro">todo mundo</span>
              </>
            )}
          </h2>

          <p className="mt-3 max-w-md text-sm leading-7 texto-suave">
            Deixe seu contato e avisamos assim que chegar moto nova no pátio —
            muitas vezes antes de ir para o anúncio.
          </p>
        </div>

        <form onSubmit={enviar} className="cartao-3d rounded-2xl p-5 sm:p-6">
          <div className="space-y-3">
            <div>
              <label
                htmlFor="interesse-nome"
                className="mb-1.5 block text-xs font-semibold texto-suave"
              >
                Seu nome
              </label>

              <input
                id="interesse-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como quer ser chamado"
                autoComplete="name"
                className={campo}
              />
            </div>

            <div>
              <label
                htmlFor="interesse-telefone"
                className="mb-1.5 block text-xs font-semibold texto-suave"
              >
                WhatsApp com DDD
              </label>

              <input
                id="interesse-telefone"
                value={telefone}
                onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
                placeholder="(12) 99999-9999"
                inputMode="tel"
                autoComplete="tel"
                className={campo}
              />
            </div>

            <div>
              <label
                htmlFor="interesse-procura"
                className="mb-1.5 block text-xs font-semibold texto-suave"
              >
                Qual moto você procura?{" "}
                <span className="font-normal opacity-70">(opcional)</span>
              </label>

              <input
                id="interesse-procura"
                value={procura}
                onChange={(e) => setProcura(e.target.value)}
                placeholder="Ex.: Honda CG 160"
                list={sugestoes.length > 0 ? "interesse-modelos" : undefined}
                className={campo}
              />

              {sugestoes.length > 0 && (
                <datalist id="interesse-modelos">
                  {sugestoes.map((modelo) => (
                    <option key={modelo} value={modelo} />
                  ))}
                </datalist>
              )}

              <p className="mt-1.5 text-xs leading-5 texto-suave">
                Se disser o modelo, avisamos assim que chegar uma parecida.
              </p>
            </div>
          </div>

          {erro && (
            <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="botao-ouro mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold disabled:opacity-60"
          >
            <BellRing size={16} />
            {enviando ? "Cadastrando..." : "Quero ser avisado"}
          </button>

          <p className="mt-3 text-center text-xs leading-5 texto-suave">
            Usamos seu contato só para avisar de moto nova. Nada de propaganda,
            e você sai quando quiser.
          </p>
        </form>
      </div>
    </section>
  );
}
