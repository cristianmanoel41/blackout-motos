import { notFound } from "next/navigation";
import PreviaDocumento from "@/components/PreviaDocumento";

/*
 * Prévia dos documentos em Word (contratos e procuração)
 * antes de imprimir ou baixar.
 *
 * A tela busca o próprio arquivo gerado pela rota do documento
 * e mostra na folha. Os dois botões ficam no topo: baixar em
 * Word para editar, ou imprimir/salvar em PDF.
 */

type Documento = {
  titulo: string;
  url: (id: string) => string;
  voltar: (id: string) => string;
  voltarRotulo: string;
};

const documentos: Record<string, Documento> = {
  "contrato-venda": {
    titulo: "o contrato de venda",
    url: (id) => `/api/contratos/venda/${id}`,
    voltar: (id) => `/vendas/${id}`,
    voltarRotulo: "Voltar para a venda",
  },

  "contrato-compra": {
    titulo: "o contrato de compra",
    url: (id) => `/api/contratos/compra/${id}`,
    voltar: (id) => `/motos/${id}`,
    voltarRotulo: "Voltar para a moto",
  },

  procuracao: {
    titulo: "a procuração",
    url: (id) => `/api/contratos/procuracao/${id}`,
    voltar: (id) => `/motos/${id}`,
    voltarRotulo: "Voltar para a moto",
  },
};

export default async function DocumentoPage({
  params,
}: {
  params: Promise<{ tipo: string; id: string }>;
}) {
  const { tipo, id } = await params;

  const documento = documentos[tipo];

  if (!documento) {
    notFound();
  }

  return (
    <PreviaDocumento
      url={documento.url(id)}
      titulo={documento.titulo}
      voltarPara={documento.voltar(id)}
      voltarRotulo={documento.voltarRotulo}
    />
  );
}
