/*
 * Dados fixos da loja, usados pelo site público.
 *
 * Ficam aqui para endereço, telefone e redes mudarem num lugar
 * só - hoje eles aparecem no cabeçalho, no rodapé, nos links
 * de WhatsApp, no mapa e nos dados de SEO.
 */

export const LOJA = {
  nome: "Blackout Motos",
  endereco: "Avenida Andrômeda, 3521",
  bairro: "Bosque dos Eucaliptos",
  cidade: "São José dos Campos",
  estado: "SP",
  cep: "12233-000",
  telefone: "(12) 3917-3777",
  telefoneLink: "+551239173777",
  whatsapp: "5512996626666",
  whatsappExibicao: "(12) 99662-6666",
};

/*
 * Horário de atendimento.
 *
 * Fica em dados, não escrito na tela, porque aparece em
 * três lugares - rodapé, página de contato e os dados que o
 * Google lê - e mudar em um só deixaria os outros mentindo.
 *
 * `dias` é o que o Google entende (Mo, Tu...); `texto` é o
 * que o cliente lê.
 */
export const HORARIOS = [
  {
    texto: "Segunda a sexta",
    horas: "09h às 18h",
    dias: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ],
    abre: "09:00",
    fecha: "18:00",
  },
  {
    texto: "Sábado",
    horas: "09h às 14h",
    dias: ["Saturday"],
    abre: "09:00",
    fecha: "14:00",
  },
  {
    texto: "Domingo",
    horas: "Fechado",
    dias: [],
    abre: "",
    fecha: "",
  },
];

export const ENDERECO_COMPLETO = `${LOJA.endereco} · ${LOJA.bairro} · ${LOJA.cidade}/${LOJA.estado}`;

export const MAPA = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${LOJA.endereco}, ${LOJA.cidade} ${LOJA.estado}`
)}`;

/*
 * Redes sociais.
 *
 * Só entra no rodapé a que tiver endereço preenchido: ícone
 * que não leva a lugar nenhum passa a impressão de site
 * abandonado. O YouTube fica em branco até a loja abrir o
 * canal - basta preencher aqui que ele aparece.
 */
export const REDES = [
  {
    nome: "Instagram",
    url: "https://www.instagram.com/blackoutmotos_/",
  },
  {
    /*
     * Endereço do perfil, sem o "sk=directory_links" do fim:
     * aquele pedaço abre uma aba interna do Facebook e some
     * quando eles mudam a interface.
     */
    nome: "Facebook",
    url: "https://www.facebook.com/profile.php?id=100095473686769",
  },
  {
    nome: "TikTok",
    url: "https://www.tiktok.com/@blackout.motos",
  },
  { nome: "YouTube", url: "" },
];
/*
 * Avaliações no Google.
 *
 * O site não copia as avaliações: ele manda o cliente ler
 * no próprio Google, onde ele confia mais e onde elas estão
 * sempre atualizadas. Sem chave de API, sem conta de
 * cobrança e sem serviço de terceiro para pagar.
 *
 * `perfil` abre a ficha da loja; `avaliar` abre a caixa de
 * escrever avaliação. Enquanto não vierem os endereços
 * curtos do Perfil da Empresa, os dois caem numa busca pelo
 * nome e endereço da loja, que chega na ficha do mesmo
 * jeito.
 */
export const GOOGLE = {
  /*
   * O endereço curto do Perfil da Empresa. Sem o /review no
   * fim ele abre a ficha da loja; com o /review, abre direto
   * a caixa de escrever - é o link que a loja já manda para
   * o cliente depois da venda.
   */
  /*
   * O identificador da loja no Google. Com ele o site pede a
   * ficha direto, sem antes procurar pelo nome - uma consulta
   * a menos, e consulta ao Google e paga.
   */
  placeId: "ChIJJQFbMn9LzJQR7m8nkBQoDUM",

  perfil: "https://g.page/r/Ce5vJ5AUKA1DEAI",
  avaliar: "https://g.page/r/Ce5vJ5AUKA1DEAI/review",

  /*
   * Nota e total só aparecem na tela quando preenchidos - e
   * só devem ser preenchidos com o que está no Google de
   * verdade. Número inventado aqui vira propaganda enganosa
   * e o cliente confere em dois toques.
   *
   * Fica fixo no código: quando a nota mudar, muda aqui.
   */
  nota: "",
  avaliacoes: "",
};

/* Link do WhatsApp já com a mensagem escrita. */
export function linkWhatsApp(mensagem: string) {
  return `https://wa.me/${
    LOJA.whatsapp
  }?text=${encodeURIComponent(mensagem)}`;
}

export const CONVITE_GERAL =
  "Olá! Vi o site da Blackout Motos e quero falar sobre uma moto.";

export const MENU = [
  { nome: "Início", href: "/" },
  { nome: "Estoque", href: "/estoque" },
  { nome: "Financiamento", href: "/financiamento" },
  { nome: "Sobre nós", href: "/sobre" },
  { nome: "Contato", href: "/contato" },
];
