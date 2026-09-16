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
  email: "contato@blackoutmotos.com.br",
};

export const ENDERECO_COMPLETO = `${LOJA.endereco} · ${LOJA.bairro} · ${LOJA.cidade}/${LOJA.estado}`;

export const MAPA = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${LOJA.endereco}, ${LOJA.cidade} ${LOJA.estado}`
)}`;

/*
 * Redes sociais.
 *
 * Só entra no rodapé a que tiver endereço preenchido: ícone que
 * não leva a lugar nenhum passa a impressão de site abandonado.
 * Quando a loja mandar os links, é só preencher aqui.
 */
export const REDES = [
  { nome: "Instagram", url: "" },
  { nome: "Facebook", url: "" },
  { nome: "TikTok", url: "" },
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
