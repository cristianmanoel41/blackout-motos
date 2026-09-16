/*
 * Dados fixos da loja, usados pelo site público.
 *
 * Ficam aqui para o endereço e o telefone mudarem num lugar
 * só - hoje eles aparecem no cabeçalho, no rodapé, no link do
 * WhatsApp e no mapa.
 */

export const LOJA = {
  nome: "Blackout Motos",
  endereco: "Avenida Andrômeda, 3521",
  bairro: "Bosque dos Eucaliptos",
  cidade: "São José dos Campos",
  estado: "SP",
  cep: "12233-000",
  telefone: "(12) 3917-3777",
  whatsapp: "5512996626666",
  whatsappExibicao: "(12) 99662-6666",
};

export const ENDERECO_COMPLETO = `${LOJA.endereco} · ${LOJA.bairro} · ${LOJA.cidade}/${LOJA.estado}`;

/* Link do WhatsApp já com a mensagem escrita. */
export function linkWhatsApp(mensagem: string) {
  return `https://wa.me/${
    LOJA.whatsapp
  }?text=${encodeURIComponent(mensagem)}`;
}
