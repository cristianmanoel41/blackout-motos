"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";

/*
 * A moto chega, vai para o mecânico e depois para o lavador -
 * e é nessa hora que o gasto é lançado. Como o lançamento mora
 * na ficha da moto, quem abria "Gastos das Motos" para lançar
 * ficava sem porta. Esta é a porta: escolhe a moto e vai.
 */

type Moto = {
  id: string;
  codigo: string | null;
  marca: string | null;
  modelo: string | null;
  placa: string | null;
  status: string | null;
};

function nomeDaMoto(moto: Moto) {
  const nome = [moto.marca, moto.modelo]
    .filter(Boolean)
    .join(" ");

  const partes = [
    moto.codigo,
    nome || "Moto",
    moto.placa,
  ].filter(Boolean);

  const rotulo = partes.join(" · ");

  return moto.status === "vendida"
    ? `${rotulo} (vendida)`
    : rotulo;
}

export default function NovoGastoBotao({
  motos,
}: {
  motos: Moto[];
}) {
  const router = useRouter();

  const [aberto, setAberto] = useState(false);
  const [motoId, setMotoId] = useState("");

  if (motos.length === 0) return null;

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-dourado px-4 py-2.5 text-sm font-bold text-preto transition hover:opacity-90"
      >
        <Plus size={16} />
        Lançar gasto
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={motoId}
        onChange={(evento) =>
          setMotoId(evento.target.value)
        }
        className="rounded-lg border border-grafite-claro bg-preto px-3 py-2.5 text-sm text-white outline-none focus:border-dourado"
      >
        <option value="">Escolha a moto</option>

        {motos.map((moto) => (
          <option key={moto.id} value={moto.id}>
            {nomeDaMoto(moto)}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={!motoId}
        onClick={() =>
          router.push(`/motos/${motoId}/gasto`)
        }
        className="rounded-lg bg-dourado px-4 py-2.5 text-sm font-bold text-preto transition hover:opacity-90 disabled:opacity-40"
      >
        Continuar
      </button>

      <button
        type="button"
        onClick={() => {
          setAberto(false);
          setMotoId("");
        }}
        className="rounded-lg border border-grafite-claro px-4 py-2.5 text-sm text-texto-suave transition hover:border-dourado hover:text-dourado"
      >
        Cancelar
      </button>
    </div>
  );
}
