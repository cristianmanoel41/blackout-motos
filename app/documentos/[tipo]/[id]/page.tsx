import { notFound } from "next/navigation";
import PreviaDocumento from "@/components/PreviaDocumento";
import AvisoCrlv from "@/components/AvisoCrlv";

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
  /*
   * Documento curto para uma folha A4 inteira: o corpo se
   * distribui entre o timbre e a data em vez de empilhar no
   * alto. A fonte vai junto porque cada um tem um tanto de
   * texto - o que enche a folha num deixa o outro passar
   * para a pagina 2.
   */
  espalhar?: boolean;
  fonte?: number;
  entrelinha?: number;
  variante?: string;
  /* Abre um espaço no meio da folha para a marca d'água. */
  marcaNoMeio?: boolean;
  /*
   * O documento leva dados da moto? Então confere com o CRLV
   * antes de imprimir. "moto" quando o id é da moto, "venda"
   * quando é da venda.
   */
  conferirCrlv?: "moto" | "venda";
};

const documentos: Record<string, Documento> = {
  "contrato-venda": {
    titulo: "o contrato de venda",
    url: (id) => `/api/contratos/venda/${id}`,
    voltar: (id) => `/vendas/${id}`,
    voltarRotulo: "Voltar para a venda",
    conferirCrlv: "venda",
  },

  "contrato-compra": {
    titulo: "o contrato de compra",
    url: (id) => `/api/contratos/compra/${id}`,
    voltar: (id) => `/motos/${id}`,
    voltarRotulo: "Voltar para a moto",
    conferirCrlv: "moto",
    espalhar: true,
    /*
     * O teto subiu de 15 para 17, e a entrelinha apertou de
     * 1,65 para 1,5.
     *
     * As duas coisas juntas porque "letra pequena" tinha duas
     * causas possiveis e nao dava para saber qual: ou o texto
     * cabia em 15 e 15 era pouco, ou nao cabia e a folha ja
     * estava encolhendo a letra sozinha. Subir o teto resolve
     * a primeira; sobrar altura resolve a segunda.
     *
     * A medicao da folha continua mandando: se 17 nao couber,
     * ela desce de meio em meio ponto ate caber. A margem nao
     * corre risco.
     *
     * 14/11/2026: a loja pediu o contrato igual ao da Rosangela,
     * o modelo do Word que usava antes do sistema: letra 11 e
     * espaçamento 1,5 do Word (no navegador, 1,8 - o "simples"
     * do Word para a Calibri já é 1,22). A folha não estica mais
     * a letra; só encolhe se o texto não couber.
     */
    fonte: 11,
    entrelinha: 1.8,
    /*
     * 14/11/2026: a loja quer a marca d'água à mostra, num
     * espaço vazio no meio da folha, e não escondida atrás do
     * texto.
     */
    marcaNoMeio: true,
  },

  /*
   * A lista do estoque nao tem id: e sempre o estoque inteiro.
   * O endereco leva um mesmo assim para caber na rota dos
   * documentos - e assim ela herda a moldura, a marca d'agua e
   * o botao de imprimir que os contratos ja usam.
   */
  estoque: {
    titulo: "a lista do estoque",
    url: () => "/api/estoque/lista",
    voltar: () => "/admin/estoque",
    voltarRotulo: "Voltar para o estoque",
    variante: "lista",
  },

  procuracao: {
    titulo: "a procuração",
    url: (id) => `/api/contratos/procuracao/${id}`,
    voltar: (id) => `/motos/${id}`,
    voltarRotulo: "Voltar para a moto",
    conferirCrlv: "moto",
    espalhar: true,
    /*
     * 14/11/2026: a loja pediu a letra um pouco maior. Em 12 a
     * folha já estava cheia, então para caber 13 a entrelinha
     * apertou de 1,65 (o padrão) para 1,4.
     */
    fonte: 13,
    entrelinha: 1.4,
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
      espalhar={!!documento.espalhar}
      fonte={documento.fonte}
      entrelinha={documento.entrelinha}
      variante={documento.variante}
      marcaNoMeio={!!documento.marcaNoMeio}
      aviso={
        documento.conferirCrlv === "moto" ? (
          <AvisoCrlv motoId={id} />
        ) : documento.conferirCrlv === "venda" ? (
          <AvisoCrlv vendaId={id} />
        ) : null
      }
    />
  );
}
