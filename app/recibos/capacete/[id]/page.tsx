import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { montarDadosRecibo } from "@/lib/recibos/capacete";
import ImprimirReciboButton from "./ImprimirReciboButton";

/*
 * RECIBO BLACKOUT MOTOS
 * Tamanho de impressão: 14 cm x 9 cm
 *
 * Este arquivo foi feito para substituir:
 * app/recibos/capacete/[id]/page.tsx
 *
 * Não precisa alterar o globals.css para este recibo,
 * porque as regras de impressão estão dentro desta página.
 */

function primeiroValor(
  dados: Record<string, unknown>,
  chaves: string[]
) {
  for (const chave of chaves) {
    const valor = dados[chave];

    if (
      valor !== null &&
      valor !== undefined &&
      String(valor).trim() !== ""
    ) {
      return String(valor);
    }
  }

  return "";
}

function formatarMoedaFlexivel(valor: string) {
  const limpo = valor.trim();

  if (!limpo) {
    return "";
  }

  // Se já veio formatado pelo montarDadosRecibo,
  // mantém exatamente como está.
  if (
    limpo.includes("R$") ||
    limpo.includes(",")
  ) {
    return limpo;
  }

  const numero = Number(limpo);

  if (!Number.isFinite(numero)) {
    return limpo;
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numero);
}

function dataAtualExtenso() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export default async function ReciboCapacetePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { dados, erro } =
    await montarDadosRecibo(
      supabase,
      id
    );

  if (erro || !dados) {
    return (
      <main className="min-h-screen bg-[#070707] p-6 text-white">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-900 bg-red-950/30 p-6">
          <h1 className="text-xl font-bold text-red-300">
            Não foi possível abrir o recibo
          </h1>

          <p className="mt-3 text-sm text-red-200">
            {erro ||
              "Não foi possível montar o recibo."}
          </p>

          <Link
            href="/capacetes/vendas"
            className="mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200"
          >
            ← Voltar
          </Link>
        </div>
      </main>
    );
  }

  /*
   * Busca os itens vendidos para preencher automaticamente
   * a MARCA e o MODELO do capacete no recibo.
   *
   * O recibo continua funcionando mesmo para vendas antigas:
   * se não encontrar os itens, usa a descrição que já vinha
   * de montarDadosRecibo.
   */
  const { data: itensCapacete } =
    await supabase
      .from("helmet_sale_items")
      .select(
        "produto, marca, modelo, cor, tamanho, quantidade"
      )
      .eq("helmet_sale_id", id);

  const descricaoMarcaModelo =
    (itensCapacete ?? [])
      .map((item) => {
        const quantidade =
          Number(item.quantidade || 0) || 1;

        const marca = String(
          item.marca || ""
        ).trim();

        const modelo = String(
          item.modelo || ""
        ).trim();

        const marcaModelo = [
          marca,
          modelo,
        ]
          .filter(Boolean)
          .join(" ");

        if (!marcaModelo) {
          return "";
        }

        return `${
          quantidade > 1
            ? `${quantidade}x `
            : ""
        }${marcaModelo}`;
      })
      .filter(Boolean)
      .join("; ");

  const d =
    dados as unknown as Record<
      string,
      unknown
    >;

  const numero =
    primeiroValor(d, [
      "numero_recibo",
      "numero",
      "recibo_numero",
    ]) ||
    id.slice(-8).toUpperCase();

  const cliente =
    primeiroValor(d, [
      "cliente_nome",
      "nome_cliente",
      "cliente",
      "nome",
    ]) || "Não informado";

  const cpf =
    primeiroValor(d, [
      "cliente_cpf",
      "cpf_cliente",
      "cpf",
    ]);

  const rg =
    primeiroValor(d, [
      "cliente_rg",
      "rg_cliente",
      "rg",
    ]);

  const valorBruto =
    primeiroValor(d, [
      "valor_total",
      "valor_venda",
      "valor",
      "total",
      "valor_recibo",
    ]);

  const valor =
    formatarMoedaFlexivel(
      valorBruto
    );

  const valorExtenso =
    primeiroValor(d, [
      "valor_extenso",
      "valor_total_extenso",
      "valor_venda_extenso",
      "valor_por_extenso",
    ]);

  const referenteOriginal =
    primeiroValor(d, [
      "referente",
      "descricao",
      "descricao_produtos",
      "produto_descricao",
      "itens_descricao",
      "descricao_itens",
      "capacetes_descricao",
    ]);

  const referente =
    descricaoMarcaModelo
      ? `Capacete: ${descricaoMarcaModelo}`
      : referenteOriginal ||
        "Compra de capacete(s)";

  const formaPagamento =
    primeiroValor(d, [
      "forma_pagamento_descricao",
      "forma_pagamento",
      "pagamento_descricao",
    ]);

  const data =
    primeiroValor(d, [
      "data_extenso",
      "data_venda_extenso",
      "data",
    ]) || dataAtualExtenso();

  const emitente =
    primeiroValor(d, [
      "vendedor",
      "emitente",
      "usuario_nome",
    ]);

  return (
    <>
      <main className="min-h-screen bg-[#0a0a0a] px-4 py-6 text-white print:min-h-0 print:bg-white print:p-0">
        {/* CONTROLES - NÃO SAEM NA IMPRESSÃO */}
        <div className="no-print mx-auto mb-5 flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <Link
            href="/capacetes/vendas"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-yellow-500 hover:text-yellow-400"
          >
            ← Voltar
          </Link>

          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/recibos/capacete/${id}`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-yellow-500 hover:text-yellow-400"
            >
              Baixar Word
            </a>

            <ImprimirReciboButton />
          </div>
        </div>

        {/* RECIBO 14 CM x 9 CM */}
        <section className="folha-recibo mx-auto overflow-hidden bg-white text-black shadow-2xl print:shadow-none">
          {/* CABEÇALHO */}
          <header className="recibo-cabecalho">
            <div className="recibo-logo-area">
              <img
                src="/logo-blackout.png"
                alt="Blackout Motos"
                className="recibo-logo"
              />

              <div className="recibo-loja">
                <strong>
                  BLACKOUT MOTOS
                </strong>

                <span>
                  Av. Andrômeda, 3521 · Bosque dos Eucaliptos
                </span>

                <span>
                  São José dos Campos/SP · CEP 12233-000
                </span>

                <span>
                  (12) 3917-3777 · (12) 99662-6666
                </span>
              </div>
            </div>

            <div className="recibo-titulo-area">
              <h1>RECIBO</h1>

              <div className="recibo-topo-dados">
                <div>
                  <span>Nº</span>
                  <strong>
                    {numero}
                  </strong>
                </div>

                <div>
                  <span>VALOR</span>
                  <strong>
                    {valor || "R$ 0,00"}
                  </strong>
                </div>
              </div>
            </div>
          </header>

          {/* CORPO */}
          <div className="recibo-corpo">
            <div className="linha-campo">
              <span className="rotulo">
                Recebi(emos) de
              </span>

              <strong className="conteudo linha">
                {cliente}
              </strong>
            </div>

            <div className="linha-campo">
              <span className="rotulo">
                CPF
              </span>

              <span className="conteudo linha">
                {cpf || "—"}
              </span>

              {rg && (
                <>
                  <span className="rotulo rotulo-rg">
                    RG
                  </span>

                  <span className="conteudo linha rg">
                    {rg}
                  </span>
                </>
              )}
            </div>

            <div className="linha-campo">
              <span className="rotulo">
                a quantia de
              </span>

              <span className="conteudo linha">
                {valorExtenso ||
                  valor ||
                  "—"}
              </span>
            </div>

            <div className="linha-campo">
              <span className="rotulo">
                Referente a
              </span>

              <span className="conteudo linha referencia">
                {referente}
              </span>
            </div>

            {formaPagamento && (
              <div className="linha-campo">
                <span className="rotulo">
                  Pagamento
                </span>

                <span className="conteudo linha">
                  {formaPagamento}
                </span>
              </div>
            )}

            <p className="declaracao">
              E para clareza firmo(amos)
              o presente recibo.
            </p>

            <p className="data-recibo">
              São José dos Campos,{" "}
              <strong>{data}</strong>.
            </p>
          </div>

          {/* ASSINATURAS / CARIMBO */}
          <footer className="recibo-assinaturas">
            <div className="assinatura assinatura-loja">
              <div className="espaco-carimbo" />

              <div className="linha-assinatura" />

              <strong>
                Assinatura / Carimbo da Loja
              </strong>

              {emitente && (
                <span>
                  Emitente: {emitente}
                </span>
              )}
            </div>

            <div className="assinatura">
              <div className="espaco-carimbo" />

              <div className="linha-assinatura" />

              <strong>
                Assinatura do Cliente
              </strong>

              <span>
                {cliente}
              </span>
            </div>
          </footer>
        </section>
      </main>

      {/* CSS EXCLUSIVO DO RECIBO */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .folha-recibo {
              width: 14cm;
              height: 9cm;
              box-sizing: border-box;
              padding: 3.2mm 4mm;
              border: 0.35mm solid #1f1f1f;
              border-radius: 2.5mm;
              font-family: Arial, Helvetica, sans-serif;
              display: flex;
              flex-direction: column;
            }

            .recibo-cabecalho {
              height: 22mm;
              display: grid;
              grid-template-columns: 1.15fr 0.85fr;
              gap: 4mm;
              padding-bottom: 2.5mm;
              border-bottom: 0.35mm solid #c89521;
            }

            .recibo-logo-area {
              min-width: 0;
              display: flex;
              align-items: center;
              gap: 2.5mm;
            }

            .recibo-logo {
              width: 25mm;
              height: 16mm;
              object-fit: contain;
              object-position: center;
            }

            .recibo-loja {
              min-width: 0;
              display: flex;
              flex-direction: column;
              line-height: 1.22;
            }

            .recibo-loja strong {
              font-size: 9pt;
              letter-spacing: 0.4px;
            }

            .recibo-loja span {
              font-size: 5.8pt;
              white-space: nowrap;
            }

            .recibo-titulo-area {
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: 1.5mm;
            }

            .recibo-titulo-area h1 {
              margin: 0;
              text-align: center;
              font-size: 18pt;
              line-height: 1;
              letter-spacing: 1.5px;
            }

            .recibo-topo-dados {
              display: grid;
              grid-template-columns: 0.8fr 1.2fr;
              gap: 2mm;
            }

            .recibo-topo-dados > div {
              min-width: 0;
              border: 0.25mm solid #555;
              border-radius: 1.2mm;
              padding: 1mm 1.5mm;
              display: flex;
              align-items: center;
              gap: 1.2mm;
              overflow: hidden;
            }

            .recibo-topo-dados span {
              font-size: 5.5pt;
              font-weight: 700;
            }

            .recibo-topo-dados strong {
              min-width: 0;
              font-size: 7.2pt;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .recibo-corpo {
              flex: 1;
              min-height: 0;
              padding-top: 2.4mm;
              font-size: 7pt;
            }

            .linha-campo {
              min-height: 6mm;
              display: flex;
              align-items: flex-end;
              gap: 1.4mm;
            }

            .rotulo {
              flex: 0 0 auto;
              font-size: 6.8pt;
              font-weight: 700;
              white-space: nowrap;
            }

            .rotulo-rg {
              margin-left: 2mm;
            }

            .conteudo {
              min-width: 0;
              flex: 1;
              padding: 0 0.8mm 0.7mm;
              font-size: 7pt;
            }

            .linha {
              border-bottom: 0.22mm solid #333;
            }

            .rg {
              flex: 0 0 28mm;
            }

            .referencia {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .declaracao {
              margin: 1.8mm 0 0;
              font-size: 6.3pt;
              font-weight: 600;
            }

            .data-recibo {
              margin: 1.6mm 0 0;
              text-align: right;
              font-size: 6.3pt;
            }

            .recibo-assinaturas {
              height: 22mm;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 7mm;
              padding-top: 1.8mm;
            }

            .assinatura {
              min-width: 0;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: flex-end;
            }

            .assinatura-loja {
              border-right: 0.22mm solid #c89521;
              padding-right: 4mm;
            }

            .espaco-carimbo {
              height: 9mm;
            }

            .linha-assinatura {
              width: 100%;
              border-top: 0.25mm solid #222;
            }

            .assinatura strong {
              margin-top: 1mm;
              font-size: 6.2pt;
            }

            .assinatura span {
              margin-top: 0.5mm;
              font-size: 5.3pt;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            @media screen {
              .folha-recibo {
                max-width: 100%;
              }
            }

            @media print {
              @page {
                size: 14cm 9cm;
                margin: 0;
              }

              html,
              body {
                width: 14cm !important;
                height: 9cm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
              }

              body * {
                visibility: hidden;
              }

              .folha-recibo,
              .folha-recibo * {
                visibility: visible;
              }

              .folha-recibo {
                position: fixed !important;
                inset: 0 !important;
                width: 14cm !important;
                height: 9cm !important;
                margin: 0 !important;
                padding: 3.2mm 4mm !important;
                box-shadow: none !important;
                overflow: hidden !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }

              .no-print {
                display: none !important;
              }

              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `,
        }}
      />

    </>
  );
}
