"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ExcluirGastoButton({
  gastoId,
  descricao,
}: {
  gastoId: string;
  descricao: string;
}) {
  const router = useRouter();

  const [excluindo, setExcluindo] =
    useState(false);

  const [erro, setErro] =
    useState("");

  async function excluir() {
    setErro("");

    const confirmou = window.confirm(
      `Remover o lançamento "${descricao}"?\n\n` +
        "Se esse gasto gerou uma saída no caixa, " +
        "a saída vinculada também será removida.\n\n" +
        "Essa ação não pode ser desfeita."
    );

    if (!confirmou) {
      return;
    }

    setExcluindo(true);

    try {
      const resposta = await fetch(
        `/api/gastos/${encodeURIComponent(
          gastoId
        )}`,
        {
          method: "DELETE",
        }
      );

      const dados = await resposta
        .json()
        .catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          dados?.error ||
            "Não foi possível remover o lançamento."
        );
      }

      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível remover o lançamento."
      );
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={excluir}
        disabled={excluindo}
        className="font-semibold text-red-400 transition hover:text-red-300 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
      >
        {excluindo
          ? "Removendo..."
          : "Excluir"}
      </button>

      {erro && (
        <span className="mt-1 max-w-[220px] text-right text-xs text-red-400">
          {erro}
        </span>
      )}
    </div>
  );
}
