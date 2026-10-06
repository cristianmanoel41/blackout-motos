"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/*
 * Apagar o cadastro do cliente.
 *
 * Nasceu de um caso concreto: dois clientes de teste ficaram no
 * cadastro e só saíram por SQL rodado à mão. Para isso não
 * precisa de programador.
 *
 * O QUE ESTE BOTÃO NÃO FAZ
 *
 * Não apaga quem já comprou. O banco se recusa - a venda aponta
 * para o cliente e a chave estrangeira segura - e isso está
 * certo: o nome de quem comprou faz parte da venda, e sumir com
 * ele deixaria a nota sem dono.
 *
 * Em vez de deixar a pessoa tentar e receber um erro de banco
 * em inglês, o botão conta as vendas ANTES e explica. Quem tem
 * venda não ganha botão nenhum, ganha o motivo.
 */

export default function ApagarCliente({
  id,
  nome,
}: {
  id: string;
  nome: string;
}) {
  const router = useRouter();

  const [vendas, setVendas] = useState<number | null>(null);
  const [capacetes, setCapacetes] = useState(0);
  const [documentos, setDocumentos] = useState(0);
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function contar() {
      const supabase = createClient();

      const [v, c, d] = await Promise.all([
        supabase
          .from("sales")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", id),
        supabase
          .from("helmet_sales")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", id),
        supabase
          .from("customer_documents")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", id),
      ]);

      setVendas(v.count || 0);
      setCapacetes(c.count || 0);
      setDocumentos(d.count || 0);
    }

    if (id) contar();
  }, [id]);

  /* Ainda contando: não mostra nada, para não piscar o botão. */
  if (vendas === null) return null;

  const preso = vendas > 0 || capacetes > 0;

  if (preso) {
    const partes = [
      vendas > 0
        ? `${vendas} ${vendas === 1 ? "venda" : "vendas"}`
        : "",
      capacetes > 0
        ? `${capacetes} ${
            capacetes === 1 ? "capacete" : "capacetes"
          }`
        : "",
    ].filter(Boolean);

    return (
      <div className="mt-8 rounded-xl border border-grafite-claro bg-grafite p-4">
        <p className="text-sm leading-6 text-texto-suave">
          Este cliente não pode ser apagado: ele tem{" "}
          <strong className="text-texto">
            {partes.join(" e ")}
          </strong>{" "}
          no histórico da loja. O nome de quem comprou faz parte
          da venda — apagar deixaria a nota sem dono.
        </p>
      </div>
    );
  }

  async function apagar() {
    const certeza = window.confirm(
      [
        `Apagar o cadastro de ${nome || "este cliente"}?`,
        "",
        documentos > 0
          ? `Os ${documentos} documento(s) guardados dele também serão apagados.`
          : "",
        "Isso não tem volta.",
      ]
        .filter(Boolean)
        .join("\n")
    );

    if (!certeza) return;

    setErro("");
    setApagando(true);

    const supabase = createClient();

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id);

    if (error) {
      /*
       * 23503 é a chave estrangeira segurando.
       *
       * Não deveria acontecer - a contagem acima já barrou -,
       * mas pode, se alguém lançar uma venda para este cliente
       * enquanto a tela está aberta. Melhor dizer o que é do
       * que mostrar o código do Postgres.
       */
      setErro(
        error.code === "23503"
          ? "Este cliente passou a ter registro na loja enquanto a tela estava aberta. Recarregue a página."
          : error.message
      );

      setApagando(false);
      return;
    }

    router.push("/clientes");
    router.refresh();
  }

  return (
    <div className="mt-8 rounded-xl border border-red-500/25 bg-red-500/[0.04] p-4">
      <p className="text-sm font-semibold text-texto">
        Apagar este cadastro
      </p>

      <p className="mt-1 text-sm leading-6 text-texto-suave">
        Este cliente não tem nenhuma compra registrada, então dá
        para apagar.
        {documentos > 0 && (
          <>
            {" "}
            Os <strong className="text-texto">
              {documentos}
            </strong>{" "}
            documento(s) guardados dele vão junto.
          </>
        )}{" "}
        Não tem volta.
      </p>

      {erro && (
        <p className="mt-3 text-sm text-red-300">{erro}</p>
      )}

      <button
        type="button"
        onClick={apagar}
        disabled={apagando}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-bold text-red-300 transition hover:border-red-500/70 disabled:opacity-50"
      >
        {apagando ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Apagando...
          </>
        ) : (
          <>
            <Trash2 size={15} />
            Apagar cadastro
          </>
        )}
      </button>
    </div>
  );
}
