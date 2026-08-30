import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { Bike } from "lucide-react";

/*
 * Vitrine do estoque para outra loja.
 *
 * Página pública: abre sem login, pelo link com o código. Só
 * mostra moto disponível e só as colunas de vitrine - a função
 * no banco não devolve valor de compra, gastos, fornecedor nem
 * dado de cliente, então não há como vazar por aqui.
 */

export const dynamic = "force-dynamic";

type MotoVitrine = {
  id: string;
  codigo: string | null;
  marca: string | null;
  modelo: string | null;
  versao: string | null;
  cor: string | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  quilometragem: number | null;
  preco_anunciado: number | null;
};

function anos(moto: MotoVitrine) {
  const fabricacao = moto.ano_fabricacao;
  const modelo = moto.ano_modelo;

  if (fabricacao && modelo) {
    return `${fabricacao}/${modelo}`;
  }

  return String(fabricacao || modelo || "—");
}

function quilometragem(valor: number | null) {
  if (valor === null || valor === undefined) return "—";

  return `${new Intl.NumberFormat("pt-BR").format(
    valor
  )} km`;
}

export default async function VitrinePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await createClient();

  const { data: info } = await supabase.rpc(
    "vitrine_info",
    { p_token: token }
  );

  const compartilhamento = (info || [])[0];

  const { data: motos, error } = await supabase.rpc(
    "estoque_compartilhado",
    { p_token: token }
  );

  const lista = (motos || []) as MotoVitrine[];

  if (!compartilhamento || error) {
    return (
      <main className="min-h-screen bg-[#f5f6f8] px-4 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-black">
            Link indisponível
          </h1>

          <p className="mt-2 text-sm text-black/60">
            Este link de estoque não existe mais ou foi
            desativado pela loja. Peça um link novo.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        {/* CABEÇALHO */}

        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-blackout-menu.png"
            alt="Blackout Motos"
            className="h-[70px] w-[180px] object-contain"
          />

          <h1 className="mt-3 text-xl font-bold text-black">
            Estoque disponível
          </h1>

          <p className="mt-1 text-sm text-black/60">
            {lista.length} moto
            {lista.length === 1 ? "" : "s"} à pronta entrega
            {compartilhamento.loja
              ? ` · compartilhado com ${compartilhamento.loja}`
              : ""}
          </p>
        </div>

        {lista.length === 0 && (
          <div className="rounded-2xl border border-black/10 bg-white p-10 text-center text-sm text-black/60">
            Nenhuma moto disponível no momento.
          </div>
        )}

        {/* LISTA */}

        {lista.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-black/10 bg-[#f7f8fa] text-left text-xs uppercase tracking-wide text-black/50">
                  <tr>
                    <th className="px-4 py-3">Moto</th>
                    <th className="px-4 py-3">Cor</th>
                    <th className="px-4 py-3">Ano</th>
                    <th className="px-4 py-3 text-right">
                      Km
                    </th>
                    <th className="px-4 py-3 text-right">
                      Valor
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {lista.map((moto) => (
                    <tr
                      key={moto.id}
                      className="border-b border-black/[.06] last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Bike
                            size={16}
                            className="shrink-0 text-black/35"
                          />

                          <div>
                            <p className="font-semibold text-black">
                              {[
                                moto.marca,
                                moto.modelo,
                                moto.versao,
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            </p>

                            {moto.codigo && (
                              <p className="text-xs text-black/45">
                                {moto.codigo}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-black/70">
                        {moto.cor || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-black/70">
                        {anos(moto)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-black/70">
                        {quilometragem(
                          moto.quilometragem
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-black">
                        {moto.preco_anunciado
                          ? formatarMoeda(
                              moto.preco_anunciado
                            )
                          : "Consultar"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-black/45">
          Blackout Motos · Avenida Andrômeda, 3521 - São José
          dos Campos/SP · (12) 3917-3777
        </p>
      </div>
    </main>
  );
}
