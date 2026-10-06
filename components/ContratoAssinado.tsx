"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  FileCheck2,
  Loader2,
  ScanLine,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/*
 * O WhatsApp DO CLIENTE, não o da loja.
 *
 * O `linkWhatsApp` do projeto aponta sempre para o número da
 * loja - serve para o visitante do site chamar a gente. Aqui é o
 * contrário: quem manda é a loja, e o destino é o cliente.
 *
 * Sem o telefone dele, o endereço sai sem número: o WhatsApp
 * abre com a mensagem pronta e pergunta para quem enviar. É
 * melhor que não oferecer o botão - a mensagem já está escrita,
 * só falta escolher o contato.
 */
function conversaComOCliente(
  mensagem: string,
  telefone: string
) {
  const digitos = (telefone || "").replace(/\D/g, "");

  /*
   * O 55 do Brasil entra quando falta.
   *
   * O cadastro guarda "(12) 99999-9999", sem país. O wa.me
   * exige o número internacional inteiro, e sem o 55 ele abre
   * uma conversa com um número que não existe.
   */
  const numero =
    digitos.length >= 10 && digitos.length <= 11
      ? "55" + digitos
      : digitos;

  const texto = encodeURIComponent(mensagem);

  return numero
    ? `https://wa.me/${numero}?text=${texto}`
    : `https://wa.me/?text=${texto}`;
}

/*
 * O contrato assinado, na ficha da venda.
 *
 * O sistema sempre gerou o contrato em branco para imprimir e
 * assinar à caneta. Depois disso o papel ficava na loja e o
 * cliente saía sem cópia - e meses depois ligava pedindo.
 *
 * Aqui a loja escaneia pelo celular, as páginas viram um PDF só,
 * e sai um link para mandar no WhatsApp dele.
 *
 * O LINK NÃO VENCE, MAS PODE SER CORTADO
 *
 * Foi o que a loja pediu: o cliente acha o contrato daqui a dois
 * anos. E revogar apaga o arquivo de verdade, não só desliga o
 * link - link desligado com o arquivo no lugar protege de quem
 * usa o site, não de quem salvou o endereço.
 */

type Contrato = {
  id: string;
  token: string;
  paginas: number;
  criado_em: string;
  ativo: boolean;
};

export default function ContratoAssinado({
  vendaId,
  cliente,
  telefone,
}: {
  vendaId: string;
  cliente: string;
  telefone: string;
}) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState("");

  const campo = useRef<HTMLInputElement>(null);

  async function buscar() {
    const supabase = createClient();

    const { data } = await supabase
      .from("contratos_assinados")
      .select("id, token, paginas, criado_em, ativo")
      .eq("venda_id", vendaId)
      .order("criado_em", { ascending: false });

    setContratos((data || []) as Contrato[]);
    setCarregando(false);
  }

  useEffect(() => {
    if (vendaId) buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendaId]);

  /* O endereço completo, que é o que vai na mensagem. */
  const enderecoDe = (token: string) =>
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/contrato/${token}`;

  async function enviar(arquivos: FileList | null) {
    if (!arquivos || arquivos.length === 0) return;

    setErro("");
    setEnviando(true);

    const corpo = new FormData();

    corpo.append("venda", vendaId);

    for (const arquivo of Array.from(arquivos)) {
      corpo.append("paginas", arquivo);
    }

    try {
      const resposta = await fetch("/api/contratos/assinado", {
        method: "POST",
        body: corpo,
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado?.error || "Não consegui enviar."
        );
      }

      await buscar();
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não consegui enviar."
      );
    } finally {
      setEnviando(false);
      if (campo.current) campo.current.value = "";
    }
  }

  async function revogar(contrato: Contrato) {
    const certeza = window.confirm(
      [
        "Revogar apaga o arquivo do contrato e o link para de funcionar.",
        "",
        "O cliente não vai mais conseguir abrir a cópia dele.",
        "Isso não tem volta: para ter o link de novo, é preciso escanear outra vez.",
      ].join("\n")
    );

    if (!certeza) return;

    setErro("");

    try {
      const resposta = await fetch(
        `/api/contratos/assinado?id=${contrato.id}`,
        { method: "DELETE" }
      );

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado?.error || "Não consegui revogar.");
      }

      await buscar();
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não consegui revogar."
      );
    }
  }

  function copiar(token: string) {
    navigator.clipboard?.writeText(enderecoDe(token));
    setCopiado(token);
    setTimeout(() => setCopiado(""), 2000);
  }

  function mensagem(token: string) {
    const primeiro = (cliente || "").trim().split(/\s+/)[0];

    return [
      primeiro ? `Olá, ${primeiro}!` : "Olá!",
      "",
      "Segue a cópia do seu contrato, já assinado pelas duas partes:",
      enderecoDe(token),
      "",
      "Guarde este link — ele continua valendo.",
      "",
      "Blackout Motos",
    ].join("\n");
  }

  const ativos = contratos.filter((c) => c.ativo);

  return (
    <section className="rounded-xl border border-zinc-800 bg-black p-5">
      <h3 className="mb-1 flex items-center gap-2 font-semibold text-yellow-500">
        <FileCheck2 size={18} />
        Contrato assinado
      </h3>

      <p className="mb-4 text-sm text-zinc-400">
        Escaneie o contrato que as duas partes assinaram e mande a
        cópia para o cliente. O link não vence, e pode ser
        revogado a qualquer momento.
      </p>

      {/*
        * capture não é usado de propósito.
        *
        * Com ele o celular abre direto a câmera, e a pessoa perde
        * o scanner do iPhone - que endireita a folha, tira a
        * sombra e devolve PDF. Sem ele o iOS oferece as duas
        * portas: "Tirar foto" e "Escolher arquivo", e é por esta
        * última que se chega no documento escaneado.
        */}
      <input
        ref={campo}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        multiple
        onChange={(evento) => enviar(evento.target.files)}
        className="hidden"
        id="paginas-do-contrato"
      />

      <label
        htmlFor="paginas-do-contrato"
        className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-dourado px-5 py-3 text-sm font-bold text-preto transition hover:bg-dourado-claro ${
          enviando ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {enviando ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Juntando as páginas...
          </>
        ) : (
          <>
            <ScanLine size={16} />
            {ativos.length > 0
              ? "Enviar outra via"
              : "Enviar contrato escaneado"}
          </>
        )}
      </label>

      <p className="mt-2 text-xs leading-5 text-zinc-500">
        Pode mandar várias folhas de uma vez: viram um PDF só, na
        ordem que você escolher. Aceita foto e PDF — o scanner do
        iPhone, em Notas ou Arquivos, dá o melhor resultado.
      </p>

      {erro && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {erro}
        </p>
      )}

      {!carregando && contratos.length > 0 && (
        <ul className="mt-5 space-y-3">
          {contratos.map((contrato) => (
            <li
              key={contrato.id}
              className={`rounded-xl border p-4 ${
                contrato.ativo
                  ? "border-zinc-700 bg-zinc-900"
                  : "border-zinc-800 bg-zinc-900/40"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {contrato.paginas}{" "}
                    {contrato.paginas === 1 ? "folha" : "folhas"}
                    {!contrato.ativo && (
                      <span className="ml-2 rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-bold uppercase text-zinc-400">
                        revogado
                      </span>
                    )}
                  </p>

                  <p className="mt-0.5 text-xs text-zinc-500">
                    Enviado em{" "}
                    {new Date(contrato.criado_em).toLocaleString(
                      "pt-BR",
                      { dateStyle: "short", timeStyle: "short" }
                    )}
                  </p>
                </div>

                {contrato.ativo && (
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/contrato/${contrato.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:border-dourado hover:text-dourado"
                    >
                      Conferir
                    </a>

                    <button
                      type="button"
                      onClick={() => copiar(contrato.token)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:border-dourado hover:text-dourado"
                    >
                      {copiado === contrato.token ? (
                        <>
                          <Check size={13} />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          Copiar link
                        </>
                      )}
                    </button>

                    <a
                      href={conversaComOCliente(
                        mensagem(contrato.token),
                        telefone
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-dourado px-3 py-2 text-xs font-bold text-preto transition hover:bg-dourado-claro"
                    >
                      Mandar no WhatsApp
                    </a>

                    <button
                      type="button"
                      onClick={() => revogar(contrato)}
                      title="Revogar: apaga o arquivo e derruba o link"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 transition hover:border-red-500/60"
                    >
                      <Trash2 size={13} />
                      Revogar
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
