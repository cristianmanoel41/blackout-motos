/*
 * As regras da medição do site, num lugar só.
 *
 * São usadas em dois momentos diferentes da vida da página, e
 * é por isso que moram fora do componente:
 *
 *   - o clique no WhatsApp é escutado por um script que sobe
 *     junto com o HTML, antes do React;
 *   - a tela aberta é contada pelo componente, que precisa do
 *     roteador para saber quando a pessoa troca de página.
 *
 * Duas entradas, uma regra: se mudar o endereço do registro ou
 * onde a medição vale, muda aqui e vale nas duas.
 */

export const DESTINO = "/api/visita";

/*
 * Onde a medição vale.
 *
 * Só o site publicado conta. Sem isso, cada recarga durante o
 * trabalho entraria na conta, e o número que a loja usa para
 * decidir onde anunciar viraria o número de vezes que mexemos
 * no site.
 *
 * NEXT_PUBLIC_MEDIR_LOCAL=sim no .env.local liga a medição na
 * máquina de quem desenvolve, para dar para conferir antes de
 * publicar. Na Vercel essa variável não existe - lá quem manda
 * é o domínio, então nem endereço de teste conta.
 */
export const SITE = /(^|\.)blackoutmotos\.com\.br$/;

export const MEDIR_LOCAL =
  process.env.NEXT_PUBLIC_MEDIR_LOCAL === "sim";

export function aquiConta() {
  if (typeof window === "undefined") return false;

  if (MEDIR_LOCAL) return true;

  return SITE.test(window.location.hostname);
}

/* Onde a ficha da moto marca qual moto está aberta. */
export const MARCA_DA_MOTO = "[data-moto]";

/* Todo jeito de escrever link do WhatsApp que o site usa. */
export const LINKS_WHATSAPP =
  "a[href*='wa.me'], a[href*='api.whatsapp.com']";

/*
 * O ouvinte do clique no WhatsApp, escrito para correr antes
 * do React.
 *
 * Por que não deixar isso no componente, junto do resto: o
 * botão do WhatsApp é um link comum, então ele funciona no
 * instante em que o HTML aparece na tela - bem antes de o
 * JavaScript da página terminar de carregar. Quem clica rápido
 * cai nessa fresta: o WhatsApp abre e o clique não é contado.
 *
 * No computador de quem desenvolve a fresta dura segundos. No
 * celular de quem está na rua, com sinal ruim, também. E é
 * justamente o clique no WhatsApp - o único número que liga
 * visita a conversa - que não pode se perder.
 *
 * Então ele vem inteiro aqui, em JavaScript simples, e é
 * plantado no HTML. Sem depender de carregar nada.
 *
 * A trava `__medidorZap` existe porque script em HTML pode ser
 * executado de novo numa re-renderização: dois ouvintes
 * contariam o mesmo clique duas vezes.
 */
export function scriptDoWhatsApp() {
  return `(function(){try{
if(!${MEDIR_LOCAL ? "true" : "false"} && !/${SITE.source}/.test(location.hostname))return;
if(window.__medidorZap)return;window.__medidorZap=1;
document.addEventListener('click',function(e){
var a=e.target&&e.target.closest&&e.target.closest(${JSON.stringify(
    LINKS_WHATSAPP
  )});
if(!a)return;
var m=document.querySelector(${JSON.stringify(MARCA_DA_MOTO)});
var d=JSON.stringify({caminho:location.pathname,tipo:'whatsapp',moto:m?m.getAttribute('data-moto'):null,primeira:false});
try{if(navigator.sendBeacon&&navigator.sendBeacon(${JSON.stringify(
    DESTINO
  )},new Blob([d],{type:'application/json'})))return;}catch(x){}
fetch(${JSON.stringify(
    DESTINO
  )},{method:'POST',headers:{'Content-Type':'application/json'},body:d,keepalive:true}).catch(function(){});
});
}catch(x){}})()`;
}

/*
 * Uma simulação de pagamento que apareceu na tela.
 *
 * Conta uma vez por método em cada aba: quem arrasta a barra
 * da entrada vinte vezes é um cliente simulando, não vinte. A
 * marca fica no sessionStorage, que morre com a aba - voltar
 * outro dia conta de novo, como a visita.
 *
 * Sem sessionStorage (aba anônima com bloqueio, por exemplo)
 * ainda conta; só perde a trava, e no pior caso uma recarga
 * conta duas vezes.
 */
export function registrarSimulacao(
  metodo: "financiamento" | "cartao"
) {
  if (!aquiConta()) return;

  const chave = `simulou:${metodo}`;

  try {
    if (sessionStorage.getItem(chave)) return;
    sessionStorage.setItem(chave, "1");
  } catch {
    // Sem armazenamento: conta assim mesmo.
  }

  const corpo = JSON.stringify({
    caminho: window.location.pathname,
    tipo: `simulacao_${metodo}`,
    moto: null,
    primeira: false,
  });

  try {
    if (
      navigator.sendBeacon &&
      navigator.sendBeacon(
        DESTINO,
        new Blob([corpo], { type: "application/json" })
      )
    ) {
      return;
    }
  } catch {
    // Cai no fetch abaixo.
  }

  fetch(DESTINO, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: corpo,
    keepalive: true,
  }).catch(() => {});
}
