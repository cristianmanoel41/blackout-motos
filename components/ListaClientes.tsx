"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BotaoWhatsapp } from "@/components/CardWhatsapp";
import { Eye, Search } from "lucide-react";

/*
 * Lista de clientes em tabela.
 *
 * Antes era um card grande por cliente, três por linha: com a
 * carteira crescendo, achar alguém virava rolagem. Em linha
 * cabe muito mais gente na tela, e a busca resolve o resto.
 */

type Cliente = {
  id: string;
  nome: string | null;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
};

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function apenasNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

export default function ListaClientes({
  clientes,
}: {
  clientes: Cliente[];
}) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = semAcento(busca);

    if (!termo) return clientes;

    const numeros = apenasNumeros(busca);

    return clientes.filter((cliente) => {
      const texto = semAcento(
        [
          cliente.nome,
          cliente.cpf,
          cliente.email,
          cliente.cidade,
        ]
          .filter(Boolean)
          .join(" ")
      );

      if (texto.includes(termo)) return true;

      /*
       * CPF e telefone são procurados só pelos dígitos, para
       * achar mesmo digitando com ou sem ponto e traço.
       */
      if (numeros.length >= 3) {
        const doCliente = apenasNumeros(
          `${cliente.cpf || ""}${cliente.telefone || ""}`
        );

        if (doCliente.includes(numeros)) return true;
      }

      return false;
    });
  }, [clientes, busca]);

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-suave"
          />

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, CPF, telefone ou e-mail"
            className="w-full rounded-lg border border-grafite-claro bg-grafite py-2.5 pl-10 pr-4 text-sm text-texto outline-none transition focus:border-dourado"
          />
        </div>

        <p className="text-sm text-texto-suave">
          {filtrados.length}
          {filtrados.length !== clientes.length
            ? ` de ${clientes.length}`
            : ""}{" "}
          cliente{filtrados.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtrados.length === 0 && (
        <div className="rounded-xl border border-grafite-claro bg-grafite p-8 text-center text-sm text-texto-suave">
          Nenhum cliente encontrado com esse termo.
        </div>
      )}

      {filtrados.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-grafite-claro bg-grafite">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-grafite-claro text-left text-xs uppercase tracking-wide text-texto-suave">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">CPF</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>

            <tbody>
              {filtrados.map((cliente) => (
                <tr
                  key={cliente.id}
                  className="border-b border-grafite-claro/60 last:border-0"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="font-medium text-texto transition hover:text-dourado"
                    >
                      {cliente.nome || "Sem nome"}
                    </Link>

                    {cliente.cidade && (
                      <p className="text-xs text-texto-suave">
                        {cliente.cidade}
                      </p>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2.5 text-texto-suave">
                    {cliente.cpf || "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2.5 text-texto-suave">
                    {cliente.telefone || "—"}
                  </td>

                  <td className="max-w-[220px] px-4 py-2.5 text-texto-suave">
                    <span className="block truncate">
                      {cliente.email || "—"}
                    </span>
                  </td>

                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      {cliente.telefone && (
                        <BotaoWhatsapp
                          telefone={cliente.telefone}
                          nome={cliente.nome}
                          rotulo="WhatsApp"
                        />
                      )}

                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-grafite-claro px-3 py-2 text-xs font-semibold text-texto-suave transition hover:border-dourado hover:text-dourado"
                      >
                        <Eye size={14} />
                        Ver ficha
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
