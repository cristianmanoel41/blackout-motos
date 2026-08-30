"use client";

/*
 * Campo de "já foi pago?" usado nas telas que lançam dinheiro
 * no caixa.
 *
 * O cadastro e o pagamento nem sempre acontecem no mesmo dia:
 * a peça encomendada só é paga quando chega e é montada, o
 * banco deposita o financiamento dias depois da venda. Quando
 * a resposta é "ainda não", o lançamento fica pendente no
 * caixa esperando a baixa, e não conta no saldo.
 */

export default function CampoPagamentoFeito({
  titulo,
  pago,
  aoMudarPago,
  dataPrevista,
  aoMudarDataPrevista,
  rotuloPago = "Já foi pago",
  rotuloPendente = "Ainda vou pagar",
  ajudaPendente = "Fica pendente no caixa até você dar baixa.",
}: {
  titulo: string;
  pago: boolean;
  aoMudarPago: (valor: boolean) => void;
  dataPrevista: string;
  aoMudarDataPrevista: (valor: string) => void;
  rotuloPago?: string;
  rotuloPendente?: string;
  ajudaPendente?: string;
}) {
  const botao =
    "flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition";

  return (
    <div className="rounded-lg border border-grafite-claro bg-grafite p-4">
      <p className="mb-2 text-sm font-medium text-texto">
        {titulo}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => aoMudarPago(true)}
          className={`${botao} ${
            pago
              ? "border-dourado bg-dourado text-preto"
              : "border-grafite-claro text-texto-suave hover:border-dourado hover:text-dourado"
          }`}
        >
          {rotuloPago}
        </button>

        <button
          type="button"
          onClick={() => aoMudarPago(false)}
          className={`${botao} ${
            !pago
              ? "border-dourado bg-dourado text-preto"
              : "border-grafite-claro text-texto-suave hover:border-dourado hover:text-dourado"
          }`}
        >
          {rotuloPendente}
        </button>
      </div>

      {!pago && (
        <div className="mt-3">
          <label className="mb-1 block text-xs text-texto-suave">
            Previsão
          </label>

          <input
            type="date"
            value={dataPrevista}
            onChange={(e) =>
              aoMudarDataPrevista(e.target.value)
            }
            className="w-full rounded-lg border border-grafite-claro bg-grafite-claro px-4 py-2.5 text-sm text-texto outline-none transition focus:border-dourado"
          />

          <p className="mt-1.5 text-xs text-texto-suave">
            {ajudaPendente}
          </p>
        </div>
      )}
    </div>
  );
}
