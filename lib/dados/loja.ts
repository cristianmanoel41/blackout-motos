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
