/*
 * O EDITOR DE VÍDEO DO SISTEMA - a parte que não é tela.
 *
 * Tudo roda no navegador de quem edita: o vídeo é desenhado
 * quadro a quadro num canvas (com logo, textos e legenda por
 * cima) e gravado de novo pelo próprio navegador. Nada de vídeo
 * sobe para o servidor - vídeo de celular passa fácil de 100 MB,
 * e a Vercel não aceita nem 5 MB por envio.
 *
 * O servidor só entra na legenda automática, e recebe apenas o
 * áudio (ver app/api/video/legendas).
 */

import { LOJA } from "@/lib/dados/loja";

export type Trecho = {
  id: string;
  nome: string;
  url: string;
  arquivo: File;
  duracao: number;
  largura: number;
  altura: number;
  inicio: number;
  fim: number;
};

export type Frase = { inicio: number; fim: number; texto: string };

/*
 * Os dados da moto para os cards - cada um separado (marca,
 * modelo, ano, km, preço) porque o padrão de vídeo (pedido de
 * 19/11/2026, ver PADRAO_VIDEO_BLACKOUT.md) desenha cada um no
 * seu card. `preco` é só o número, sem "R$": o cifrão é
 * desenhado à parte, dourado, menor que o valor.
 */
export type Textos = {
  marca: string;
  modelo: string;
  ano: string;
  km: string;
  preco: string;
};

/*
 * Cada card de informação é opcional - só entra se o locutor de
 * fato falar daquilo (PADRAO_VIDEO_BLACKOUT.md, revisão de
 * 19/11/2026: "nunca mostrar card de uma informação antes ou
 * depois da fala correspondente"). Manual e cautelar começam
 * desligados porque dependem de a moto realmente ter isso -
 * ligar errado é afirmar uma coisa que não é verdade.
 */
export type Mostrar = {
  logo: boolean;
  textos: boolean;
  legendas: boolean;
  ano: boolean;
  km: boolean;
  financiamento: boolean;
  cartao: boolean;
  manual: boolean;
  cautelar: boolean;
};

/*
 * Quando cada card do padrão aparece, em segundos desde o
 * início do vídeo. `timelinePadrao` calcula um ponto de partida
 * razoável a partir da duração; a tela ajusta cada um à mão
 * depois, porque só quem ouve a narração sabe exatamente quando
 * o locutor fala do ano, do km, etc.
 */
export type Cartoes = {
  outroDuracao: number;
  ano: number;
  manual: number;
  cautelar: number;
  km: number;
  financiamento: number;
  cartao: number;
  preco: number;
};

/* Mesmos números usados no simulador de financiamento (lib/dados/simulador-chat.ts e cartao-maquininha.ts). */
export const FINANCIAMENTO_MAX_PARCELAS = 48;
export const CARTAO_MAX_PARCELAS = 24;

const DURACAO_CARD = 3.4;
const DURACAO_PRECO = 4.6;
const JANELA_FADE = 0.4;
const PRIMEIRO_CARD = 2;

export function timelinePadrao(total: number): Cartoes {
  const outroDuracao = Math.min(5.5, Math.max(3, total * 0.14));
  const janela = Math.max(total - PRIMEIRO_CARD - outroDuracao, 4);

  const passos = [DURACAO_CARD, DURACAO_CARD, DURACAO_CARD, DURACAO_CARD, DURACAO_CARD, DURACAO_CARD, DURACAO_PRECO];
  const somaPassos = passos.reduce((a, b) => a + b, 0);
  const folga = Math.max(0, (janela - somaPassos) / (passos.length + 1));

  let t = PRIMEIRO_CARD + folga;
  const inicios = passos.map((duracao) => {
    const agora = t;
    t += duracao + folga;
    return arredondar(agora);
  });

  return {
    outroDuracao: arredondar(outroDuracao),
    ano: inicios[0],
    manual: inicios[1],
    cautelar: inicios[2],
    km: inicios[3],
    financiamento: inicios[4],
    cartao: inicios[5],
    preco: inicios[6],
  };
}

/*
 * Avisa quando dois cards vão se sobrepor na tela (pedido de
 * 23/11/2026 - ajustar os sete tempos na mão, sem isso, é fácil
 * de errar e um card cobrir o outro sem ninguém perceber até
 * assistir o vídeo pronto).
 *
 * Só entram os cards ligados (`mostrar`) e com preço preenchido;
 * a tela final conta como um "card" a mais no fim, pra avisar
 * também quando algum card não cabe antes dela começar.
 */
export function conflitosDeTempo(cartoes: Cartoes, mostrar: Mostrar, temPreco: boolean, total: number): string[] {
  const candidatos: { chave: string; rotulo: string; inicio: number; duracao: number; ligado: boolean }[] = [
    { chave: "ano", rotulo: "Ano", inicio: cartoes.ano, duracao: DURACAO_CARD, ligado: mostrar.ano },
    { chave: "manual", rotulo: "Manual", inicio: cartoes.manual, duracao: DURACAO_CARD, ligado: mostrar.manual },
    { chave: "cautelar", rotulo: "Cautelar", inicio: cartoes.cautelar, duracao: DURACAO_CARD, ligado: mostrar.cautelar },
    { chave: "km", rotulo: "Km", inicio: cartoes.km, duracao: DURACAO_CARD, ligado: mostrar.km },
    { chave: "financiamento", rotulo: "Financiamento", inicio: cartoes.financiamento, duracao: DURACAO_CARD, ligado: mostrar.financiamento },
    { chave: "cartao", rotulo: "Cartão", inicio: cartoes.cartao, duracao: DURACAO_CARD, ligado: mostrar.cartao },
    { chave: "preco", rotulo: "Painel de preço", inicio: cartoes.preco, duracao: DURACAO_PRECO, ligado: temPreco },
  ];

  const janelas = candidatos
    .filter((c) => c.ligado)
    .map((c) => ({ rotulo: c.rotulo, inicio: c.inicio, fim: c.inicio + c.duracao }))
    .sort((a, b) => a.inicio - b.inicio);

  const avisos: string[] = [];
  for (let i = 0; i < janelas.length - 1; i += 1) {
    const atual = janelas[i];
    const proximo = janelas[i + 1];
    if (proximo.inicio < atual.fim) {
      avisos.push(
        `"${atual.rotulo}" só termina aos ${atual.fim.toFixed(1)}s, mas "${proximo.rotulo}" já começa aos ${proximo.inicio.toFixed(1)}s`
      );
    }
  }

  const outroInicio = Math.max(2, total - cartoes.outroDuracao);
  const ultimo = janelas[janelas.length - 1];
  if (ultimo && ultimo.fim > outroInicio) {
    avisos.push(
      `"${ultimo.rotulo}" só termina aos ${ultimo.fim.toFixed(1)}s, mas a tela final começa aos ${outroInicio.toFixed(1)}s`
    );
  }

  return avisos;
}

/* 0 fora da janela, sobe e desce em JANELA_FADE segundos, 1 no meio - igual ao padrão: card só aparece/some com fade. */
function opacidadeNaJanela(tempo: number, inicio: number, duracao: number) {
  const fim = inicio + duracao;
  if (tempo < inicio || tempo > fim) return 0;
  if (tempo < inicio + JANELA_FADE) return (tempo - inicio) / JANELA_FADE;
  if (tempo > fim - JANELA_FADE) return (fim - tempo) / JANELA_FADE;
  return 1;
}

/*
 * Maior lado do vídeo final. O padrão pede 1080x1920 de verdade
 * (revisão de 20/11/2026 - 1280 só dava 720x1280, borrado pro
 * Reels/TikTok). Em máquina fraca isso pode travar mais na hora
 * de gravar - por isso a gravação também caiu pra 24 fps (ver
 * EditorDeVideo.tsx), que pesa menos e ainda fica fluido.
 */
const LADO_MAIOR = 1920;

/* Vídeo de venda curto prende mais: a montagem automática para em 1 minuto. */
export const DURACAO_AUTOMATICA = 60;

/* O tamanho do vídeo final, pela orientação do primeiro trecho. */
export function tamanhoDoQuadro(trechos: Trecho[]) {
  const primeiro = trechos[0];
  if (!primeiro || !primeiro.largura || !primeiro.altura) return { largura: 720, altura: 1280 };

  const par = (n: number) => Math.round(n / 2) * 2;
  if (primeiro.largura >= primeiro.altura) {
    return { largura: LADO_MAIOR, altura: par((LADO_MAIOR * primeiro.altura) / primeiro.largura) };
  }
  return { largura: par((LADO_MAIOR * primeiro.largura) / primeiro.altura), altura: LADO_MAIOR };
}

export function duracaoTotal(trechos: Trecho[]) {
  return trechos.reduce((soma, t) => soma + Math.max(0, t.fim - t.inicio), 0);
}

/*
 * A montagem automática.
 *
 *   - Tira o comecinho e o finalzinho de cada trecho (o toque
 *     no botão de gravar, a câmera ainda tremendo).
 *   - Se a soma passa de 1 minuto, cada trecho fica com uma
 *     parte igual, pegando o meio dele - o começo e o fim de
 *     gravação de celular costumam ser o pior pedaço.
 *
 * Depois disso tudo continua ajustável na tela.
 */
export function montagemAutomatica(trechos: Trecho[]): Trecho[] {
  const limpos = trechos.map((t) => {
    const folga = t.duracao > 4 ? 0.3 : 0;
    return { ...t, inicio: folga, fim: Math.max(folga + 0.5, t.duracao - folga) };
  });

  const total = duracaoTotal(limpos);
  if (total <= DURACAO_AUTOMATICA) return limpos;

  /* Divide o minuto: trecho curto fica inteiro, a sobra vai para os longos. */
  let restante = DURACAO_AUTOMATICA;
  let faltam = limpos.length;
  const ordem = [...limpos].sort((a, b) => a.fim - a.inicio - (b.fim - b.inicio));
  const cota: Record<string, number> = {};
  for (const t of ordem) {
    const parte = restante / faltam;
    const usa = Math.min(parte, t.fim - t.inicio);
    cota[t.id] = usa;
    restante -= usa;
    faltam -= 1;
  }

  return limpos.map((t) => {
    const usa = cota[t.id];
    const meio = (t.inicio + t.fim) / 2;
    const inicio = Math.max(t.inicio, meio - usa / 2);
    return { ...t, inicio: arredondar(inicio), fim: arredondar(Math.min(t.fim, inicio + usa)) };
  });
}

function arredondar(n: number) {
  return Math.round(n * 10) / 10;
}

/* Quebra o texto em linhas que cabem na largura. */
function quebrarLinhas(ctx: CanvasRenderingContext2D, texto: string, largura: number) {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

const FONTE = `"Inter", "Segoe UI", Arial, sans-serif`;

/* A paleta do padrão (PADRAO_VIDEO_BLACKOUT.md), a mesma do app/v4-sistema.css. */
const GOLD = "#E0B129";
const FUNDO = "#09090B";
const CARD_BG = "17,17,19";
const BORDA = "#26292E";
const TEXTO = "#EDEDEF";
const TEXTO2 = "#9B9BA3";

function pesoPreto(tamanho: number) {
  return `900 ${tamanho}px ${FONTE}`;
}
function pesoForte(tamanho: number) {
  return `800 ${tamanho}px ${FONTE}`;
}
function pesoRotulo(tamanho: number) {
  return `700 ${tamanho}px ${FONTE}`;
}

/* Texto com espaçamento entre letras (os rótulos do padrão são sempre espaçados) - canvas não tem letter-spacing nativo. */
function textoEspacado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  texto: string,
  espaco: number,
  align: "l" | "c" | "r" = "l"
) {
  const larguras = [...texto].map((c) => ctx.measureText(c).width);
  const total = larguras.reduce((a, b) => a + b, 0) + espaco * (texto.length - 1);
  let cursor = x;
  if (align === "c") cursor = x - total / 2;
  if (align === "r") cursor = x - total;
  const alinhoOriginal = ctx.textAlign;
  ctx.textAlign = "left";
  [...texto].forEach((c, i) => {
    ctx.fillText(c, cursor, y);
    cursor += larguras[i] + espaco;
  });
  ctx.textAlign = alinhoOriginal;
  return total;
}

/* O painel "vidro" atrás dos cards: fundo escuro translúcido com borda 1px. */
function vidro(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, raio: number, alfa = 0.78) {
  ctx.fillStyle = `rgba(${CARD_BG},${alfa})`;
  ctx.strokeStyle = BORDA;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, raio);
  ctx.fill();
  ctx.stroke();
}

/* Um degradê preto na vertical, de `a0` (em y0) a `a1` (em y1) - mesma ordem do `grad()` do Python, não presume que começa transparente. */
function degrade(ctx: CanvasRenderingContext2D, L: number, y0: number, y1: number, a0: number, a1: number) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(0,0,0,${a0})`);
  g.addColorStop(1, `rgba(0,0,0,${a1})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, Math.min(y0, y1), L, Math.abs(y1 - y0));
}

type Pilula = { texto: string; destaque?: boolean };

/* As "pills" com ano, km, modelo - a do destaque vem preenchida de branco, as outras só com borda. */
function pilulas(ctx: CanvasRenderingContext2D, x: number, y: number, itens: Pilula[], altura: number, align: "l" | "c" = "l") {
  const margem = 18;
  const larguras = itens.map((it) => ctx.measureText(it.texto).width + margem * 2);
  const total = larguras.reduce((a, b) => a + b, 0) + 12 * (itens.length - 1);
  let cursor = align === "c" ? x - total / 2 : x;
  const alinhoOriginal = ctx.textAlign;
  ctx.textAlign = "left";
  itens.forEach((it, i) => {
    const w = larguras[i];
    ctx.beginPath();
    ctx.roundRect(cursor, y, w, altura, altura / 2);
    if (it.destaque) {
      ctx.fillStyle = TEXTO;
      ctx.fill();
    } else {
      ctx.strokeStyle = "rgba(155,155,163,0.55)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = it.destaque ? FUNDO : TEXTO;
    ctx.fillText(it.texto, cursor + margem, y + altura / 2 + Number(ctx.font.match(/(\d+)px/)?.[1] || 20) * 0.32);
    cursor += w + 12;
  });
  ctx.textAlign = alinhoOriginal;
}

/*
 * Um card de informação - rótulo dourado espaçado em cima, valor
 * grande embaixo, centralizado, no rodapé do vídeo. Mesmo layout
 * para ANO, QUILOMETRAGEM, FINANCIAMENTO e CARTÃO; só o texto
 * muda. Sem zoom nem deslize - só a opacidade `op` (0 a 1) liga e
 * desliga.
 */
function cardDeInformacao(
  ctx: CanvasRenderingContext2D,
  L: number,
  A: number,
  ex: number,
  ey: number,
  rotulo: string,
  valor: string,
  op: number
) {
  if (op <= 0) return;
  ctx.save();
  ctx.globalAlpha = op;

  ctx.font = pesoPreto(92 * Math.min(ex, ey));
  const vw = ctx.measureText(valor).width;
  ctx.font = pesoRotulo(26 * Math.min(ex, ey));
  const lw = [...rotulo].reduce((a, c) => a + ctx.measureText(c).width, 0) + 6 * (rotulo.length - 1);
  const largura = Math.max(vw, lw) + 110 * ex;
  const altura = 200 * ey;
  const x0 = (L - largura) / 2;
  const y0 = A - (360 * ey); // topo do card, de baixo para cima - 1560/1920 do padrão

  degrade(ctx, L, A - 520 * ey, A, 0, 0.55);
  vidro(ctx, x0, y0, largura, altura, 40 * Math.min(ex, ey));

  ctx.fillStyle = GOLD;
  ctx.fillRect(L / 2 - 26 * ex, y0 + 24 * ey, 52 * ex, 5 * ey);

  ctx.textAlign = "center";
  textoEspacado(ctx, L / 2, y0 + 42 * ey + 26 * Math.min(ex, ey) * 0.75, rotulo, 6 * ex, "c");

  ctx.font = pesoPreto(92 * Math.min(ex, ey));
  ctx.fillStyle = TEXTO;
  ctx.fillText(valor, L / 2, y0 + 78 * ey + 92 * Math.min(ex, ey) * 0.78);
  ctx.restore();
}

/*
 * O card "ACOMPANHA / MANUAL / CHAVE RESERVA" - igual ao card de
 * informação, só que com duas linhas de valor (caixa mais alta,
 * letra um pouco menor para caber as duas).
 */
function cardManualEChave(ctx: CanvasRenderingContext2D, L: number, A: number, ex: number, ey: number, op: number) {
  if (op <= 0) return;
  ctx.save();
  ctx.globalAlpha = op;
  const e = Math.min(ex, ey);
  const linhas = ["MANUAL", "CHAVE RESERVA"];

  ctx.font = pesoPreto(74 * e);
  const vw = Math.max(...linhas.map((t) => ctx.measureText(t).width));
  const largura = vw + 120 * ex;
  const altura = 280 * ey;
  const x0 = (L - largura) / 2;
  const y0 = A - 420 * ey;

  degrade(ctx, L, A - 580 * ey, A, 0, 0.55);
  vidro(ctx, x0, y0, largura, altura, 40 * e);

  ctx.fillStyle = GOLD;
  ctx.fillRect(L / 2 - 26 * ex, y0 + 24 * ey, 52 * ex, 5 * ey);

  ctx.textAlign = "center";
  ctx.font = pesoRotulo(26 * e);
  textoEspacado(ctx, L / 2, y0 + 42 * ey + 26 * e * 0.75, "ACOMPANHA", 6 * ex, "c");

  ctx.font = pesoPreto(74 * e);
  ctx.fillStyle = TEXTO;
  linhas.forEach((linha, i) => {
    ctx.fillText(linha, L / 2, y0 + 80 * ey + 74 * e * 0.78 + i * 88 * ey);
  });
  ctx.restore();
}

/* O cabeçalho fixo, do início até o começo da tela final: logo pequena à esquerda, marca/modelo à direita. */
function cabecalho(
  ctx: CanvasRenderingContext2D,
  L: number,
  ex: number,
  ey: number,
  logo: HTMLImageElement | null,
  textos: Textos,
  op: number
) {
  if (op <= 0) return;
  ctx.save();
  ctx.globalAlpha = op;
  degrade(ctx, L, 0, 300 * ey, 0.65, 0);

  if (logo && logo.naturalWidth) {
    const w = 240 * ex;
    const h = (w * logo.naturalHeight) / logo.naturalWidth;
    ctx.drawImage(logo, 50 * ex, 44 * ey, w, h);
  }

  const e = Math.min(ex, ey);
  const xd = L - 56 * ex;
  ctx.textAlign = "right";
  ctx.font = pesoRotulo(20 * e);
  textoEspacado(ctx, xd, 62 * ey + 20 * e * 0.8, textos.marca.toUpperCase(), 5 * ex, "r");
  ctx.font = pesoForte(40 * e);
  ctx.fillStyle = TEXTO;
  const linha = `${textos.modelo} ${textos.ano}`.trim();
  ctx.fillText(linha, xd, 90 * ey + 40 * e * 0.8);
  ctx.fillStyle = GOLD;
  ctx.fillRect(xd - 44 * ex, 144 * ey, 44 * ex, 5 * ey);
  ctx.restore();
}

/* O painel de preço - o card mais completo, com as parcelas do financiamento e do cartão. */
function painelDePreco(
  ctx: CanvasRenderingContext2D,
  L: number,
  A: number,
  ex: number,
  ey: number,
  textos: Textos,
  op: number
) {
  if (op <= 0 || !textos.preco) return;
  ctx.save();
  ctx.globalAlpha = op;
  const e = Math.min(ex, ey);

  degrade(ctx, L, A - 570 * ey, A, 0, 0.7);
  const x0 = 40 * ex;
  const y0 = A - 480 * ey;
  const largura = L - 80 * ex;
  const altura = 400 * ey;
  vidro(ctx, x0, y0, largura, altura, 36 * e);

  ctx.font = pesoRotulo(22 * e);
  pilulas(
    ctx,
    x0 + 40 * ex,
    y0 + 38 * ey,
    [{ texto: textos.ano }, { texto: textos.km.toUpperCase() }, { texto: `${textos.marca} ${textos.modelo}`.toUpperCase().trim(), destaque: true }],
    46 * ey
  );

  ctx.textAlign = "left";
  ctx.fillStyle = TEXTO2;
  ctx.font = `600 ${21 * e}px ${FONTE}`;
  textoEspacado(ctx, x0 + 40 * ex, y0 + 120 * ey + 21 * e, "POR APENAS", 5 * ex, "l");

  const xd = x0 + largura - 40 * ex;

  /*
   * O preço não tem largura fixa (de "R$ 13.161" a "R$ 32.900"),
   * e o espaço à esquerda do traço é limitado - sem medir antes
   * de desenhar, um preço mais largo (ou a fonte de reserva do
   * sistema, se a Inter não tiver carregado a tempo) invade o
   * texto do financiamento à direita.
   */
  const espacoPreco = xd - 250 * ex - 20 * ex - (x0 + 40 * ex);
  let tamanhoPreco = 132 * e;
  const tamanhoRs = 46 * e;
  for (let tentativas = 0; tentativas < 8; tentativas += 1) {
    ctx.font = pesoForte(tamanhoRs * (tamanhoPreco / (132 * e)));
    const rwTeste = ctx.measureText("R$ ").width;
    ctx.font = pesoPreto(tamanhoPreco);
    const pwTeste = ctx.measureText(textos.preco).width;
    if (rwTeste + pwTeste <= espacoPreco || tamanhoPreco <= 50 * e) break;
    tamanhoPreco *= 0.88;
  }

  ctx.font = pesoForte(tamanhoRs * (tamanhoPreco / (132 * e)));
  ctx.fillStyle = GOLD;
  const rs = "R$ ";
  ctx.fillText(rs, x0 + 40 * ex, y0 + 206 * ey + tamanhoPreco * 0.47);
  const rw = ctx.measureText(rs).width;
  ctx.font = pesoPreto(tamanhoPreco);
  ctx.fillStyle = TEXTO;
  ctx.fillText(textos.preco, x0 + 40 * ex + rw, y0 + 206 * ey + tamanhoPreco * 0.78);

  ctx.textAlign = "right";
  ctx.fillStyle = TEXTO2;
  ctx.font = `500 ${18 * e}px ${FONTE}`;
  textoEspacado(ctx, xd, y0 + 132 * ey + 18 * e, "FINANCIAMENTO", 3 * ex, "r");
  ctx.font = pesoForte(38 * e);
  ctx.fillStyle = TEXTO;
  ctx.fillText(`até ${FINANCIAMENTO_MAX_PARCELAS}x`, xd, y0 + 166 * ey + 38 * e * 0.8);

  ctx.fillStyle = TEXTO2;
  ctx.font = `500 ${18 * e}px ${FONTE}`;
  textoEspacado(ctx, xd, y0 + 222 * ey + 18 * e, "CARTÃO DE CRÉDITO", 3 * ex, "r");
  ctx.font = pesoForte(38 * e);
  ctx.fillStyle = TEXTO;
  ctx.fillText(`até ${CARTAO_MAX_PARCELAS}x`, xd, y0 + 256 * ey + 38 * e * 0.8);

  ctx.strokeStyle = BORDA;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(xd - 250 * ex, y0 + 128 * ey);
  ctx.lineTo(xd - 250 * ex, y0 + 300 * ey);
  ctx.stroke();
  ctx.restore();
}

/* A tela final - logo grande, preço, parcelas e o botão branco do WhatsApp. */
function telaFinal(
  ctx: CanvasRenderingContext2D,
  L: number,
  A: number,
  ex: number,
  ey: number,
  logo: HTMLImageElement | null,
  textos: Textos,
  op: number
) {
  if (op <= 0) return;
  ctx.save();
  ctx.globalAlpha = op;
  const e = Math.min(ex, ey);

  ctx.fillStyle = `rgba(9,9,11,0.8)`;
  ctx.fillRect(0, 0, L, A);

  if (logo && logo.naturalWidth) {
    const w = 460 * ex;
    const h = (w * logo.naturalHeight) / logo.naturalWidth;
    ctx.drawImage(logo, (L - w) / 2, 250 * ey, w, h);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = TEXTO2;
  ctx.font = pesoRotulo(30 * e);
  textoEspacado(ctx, L / 2, 560 * ey + 30 * e, textos.marca.toUpperCase(), 10 * ex, "c");

  ctx.fillStyle = TEXTO;
  ctx.font = pesoPreto(170 * e);
  ctx.fillText(textos.modelo.toUpperCase(), L / 2, 590 * ey + 150 * e, L * 0.92);

  ctx.fillStyle = GOLD;
  ctx.fillRect(L / 2 - 30 * ex, 805 * ey, 60 * ex, 6 * ey);

  ctx.font = pesoRotulo(26 * e);
  pilulas(ctx, L / 2, 845 * ey, [{ texto: textos.ano }, { texto: textos.km.toUpperCase() }], 52 * ey, "c");

  if (textos.preco) {
    ctx.fillStyle = TEXTO2;
    ctx.font = `600 ${24 * e}px ${FONTE}`;
    textoEspacado(ctx, L / 2, 990 * ey + 24 * e, "POR APENAS", 6 * ex, "c");

    /* Preço largo (ou a fonte de reserva, se a Inter não carregou) não pode passar da borda do vídeo - ver mesma lógica em painelDePreco. */
    const espacoMaximo = L * 0.86;
    let tamanhoValor = 190 * e;
    let rw = 0;
    let vw = 0;
    for (let tentativas = 0; tentativas < 8; tentativas += 1) {
      ctx.font = pesoForte(64 * e * (tamanhoValor / (190 * e)));
      rw = ctx.measureText("R$").width;
      ctx.font = pesoPreto(tamanhoValor);
      vw = ctx.measureText(textos.preco).width;
      if (rw + 14 * ex + vw <= espacoMaximo || tamanhoValor <= 60 * e) break;
      tamanhoValor *= 0.88;
    }

    const x0 = L / 2 - (rw + 14 * ex + vw) / 2;
    ctx.textAlign = "left";
    ctx.font = pesoForte(64 * e * (tamanhoValor / (190 * e)));
    ctx.fillStyle = GOLD;
    ctx.fillText("R$", x0, 1090 * ey + tamanhoValor * 0.34);
    ctx.font = pesoPreto(tamanhoValor);
    ctx.fillStyle = TEXTO;
    ctx.fillText(textos.preco, x0 + rw + 14 * ex, 1020 * ey + tamanhoValor * 0.78);
    ctx.textAlign = "center";
  }

  ctx.fillStyle = TEXTO;
  ctx.font = pesoRotulo(28 * e);
  textoEspacado(
    ctx,
    L / 2,
    1265 * ey + 28 * e,
    `FINANCIAMENTO ATÉ ${FINANCIAMENTO_MAX_PARCELAS}X   •   CARTÃO ATÉ ${CARTAO_MAX_PARCELAS}X`,
    0,
    "c"
  );

  const by = 1380 * ey;
  const bh = 104 * ey;
  ctx.fillStyle = TEXTO;
  ctx.beginPath();
  ctx.roundRect(90 * ex, by, L - 180 * ex, bh, 28 * e);
  ctx.fill();
  ctx.fillStyle = FUNDO;
  ctx.font = `700 ${34 * e}px ${FONTE}`;
  ctx.fillText(`${LOJA.whatsappExibicao} · WHATSAPP`, L / 2, by + bh / 2 + 34 * e * 0.32);

  ctx.fillStyle = TEXTO2;
  ctx.font = `500 ${26 * e}px ${FONTE}`;
  ctx.fillText(`${LOJA.endereco} – ${LOJA.bairro} – ${LOJA.cidade}`, L / 2, by + bh + 44 * ey + 26 * e, L * 0.9);
  ctx.restore();
}

/*
 * Um quadro do vídeo final, seguindo o padrão (PADRAO_VIDEO_BLACKOUT.md):
 * abertura, cabeçalho fixo, cards de ano/km/financiamento/cartão
 * no tempo marcado, painel de preço, tela final com o WhatsApp, e
 * a barra de progresso dourada embaixo. Cor um pouco mais viva
 * (contraste e saturação) para chegar perto do tratamento do
 * ffmpeg, sem a estabilização - essa só dá para fazer fora do
 * navegador.
 */
export function desenharQuadro(
  ctx: CanvasRenderingContext2D,
  opcoes: {
    largura: number;
    altura: number;
    video: HTMLVideoElement | null;
    tempo: number;
    duracaoTotal: number;
    logo: HTMLImageElement | null;
    mostrar: Mostrar;
    textos: Textos;
    cartoes: Cartoes;
    frases: Frase[];
  }
) {
  const { largura: L, altura: A, video, tempo, duracaoTotal: total, logo, mostrar, textos, cartoes, frases } = opcoes;
  const ex = L / 1080;
  const ey = A / 1920;

  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, L, A);

  if (video && video.videoWidth) {
    const escala = Math.min(L / video.videoWidth, A / video.videoHeight);
    const w = video.videoWidth * escala;
    const h = video.videoHeight * escala;
    ctx.filter = "contrast(1.04) saturate(1.04)";
    ctx.drawImage(video, (L - w) / 2, (A - h) / 2, w, h);
    ctx.filter = "none";
  }

  const outroInicio = Math.max(2, total - cartoes.outroDuracao);
  const naTelaFinal = tempo >= outroInicio;
  const entrando = (inicio: number) => Math.min(1, Math.max(0, (tempo - inicio) / JANELA_FADE));

  if (mostrar.textos && naTelaFinal) {
    telaFinal(ctx, L, A, ex, ey, mostrar.logo ? logo : null, textos, entrando(outroInicio));
  } else if (mostrar.textos && textos.modelo) {
    /* Sem abertura com texto grande (revisão de 19/11/2026): o vídeo começa só com a imagem e o cabeçalho. */
    if (mostrar.logo) cabecalho(ctx, L, ex, ey, logo, textos, 1);

    if (mostrar.ano && textos.ano) cardDeInformacao(ctx, L, A, ex, ey, "ANO", textos.ano, opacidadeNaJanela(tempo, cartoes.ano, DURACAO_CARD));
    if (mostrar.manual) cardManualEChave(ctx, L, A, ex, ey, opacidadeNaJanela(tempo, cartoes.manual, DURACAO_CARD));
    if (mostrar.cautelar) cardDeInformacao(ctx, L, A, ex, ey, "CAUTELAR", "100% APROVADA", opacidadeNaJanela(tempo, cartoes.cautelar, DURACAO_CARD));
    if (mostrar.km && textos.km) cardDeInformacao(ctx, L, A, ex, ey, "QUILOMETRAGEM", textos.km.toUpperCase(), opacidadeNaJanela(tempo, cartoes.km, DURACAO_CARD));
    if (mostrar.financiamento) cardDeInformacao(ctx, L, A, ex, ey, "FINANCIAMENTO", `ATÉ ${FINANCIAMENTO_MAX_PARCELAS}X`, opacidadeNaJanela(tempo, cartoes.financiamento, DURACAO_CARD));
    if (mostrar.cartao) cardDeInformacao(ctx, L, A, ex, ey, "CARTÃO DE CRÉDITO", `ATÉ ${CARTAO_MAX_PARCELAS}X`, opacidadeNaJanela(tempo, cartoes.cartao, DURACAO_CARD));
    painelDePreco(ctx, L, A, ex, ey, textos, opacidadeNaJanela(tempo, cartoes.preco, DURACAO_PRECO));
  }

  if (mostrar.legendas) {
    const frase = frases.find((f) => tempo >= f.inicio && tempo < f.fim);
    if (frase) {
      const e = Math.min(ex, ey);
      ctx.font = pesoPreto(38 * e);
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.lineJoin = "round";
      ctx.lineWidth = 9 * e;
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.fillStyle = "#fff";
      const linhas = quebrarLinhas(ctx, frase.texto, L * 0.86).slice(-3);
      const passo = 48 * e;
      const base = A * (naTelaFinal ? 0.46 : 0.62);
      linhas.forEach((linha, i) => {
        const yLinha = base - (linhas.length - 1 - i) * passo;
        ctx.strokeText(linha, L / 2, yLinha);
        ctx.fillText(linha, L / 2, yLinha);
      });
    }
  }

  /* A barra de progresso dourada, do início ao fim do vídeo todo. */
  if (mostrar.textos && total > 0) {
    ctx.fillStyle = GOLD;
    ctx.fillRect(0, A - 10 * ey, L * Math.min(1, tempo / total), 10 * ey);
  }

  ctx.restore();
}

/* O formato que o navegador sabe gravar: MP4 quando dá (abre em tudo), senão WebM. */
export function formatoDeGravacao() {
  if (typeof MediaRecorder === "undefined") return null;
  const opcoes = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1,mp4a",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const tipo = opcoes.find((t) => MediaRecorder.isTypeSupported(t));
  if (!tipo) return null;
  return { tipo, extensao: tipo.startsWith("video/mp4") ? "mp4" : "webm" };
}

/* Áudio mono em WAV 16 bits: o formato mais simples que a transcrição aceita. */
export function wavDe(amostras: Float32Array, taxa: number) {
  const buffer = new ArrayBuffer(44 + amostras.length * 2);
  const v = new DataView(buffer);
  const escrever = (pos: number, texto: string) => {
    for (let i = 0; i < texto.length; i += 1) v.setUint8(pos + i, texto.charCodeAt(i));
  };
  escrever(0, "RIFF");
  v.setUint32(4, 36 + amostras.length * 2, true);
  escrever(8, "WAVE");
  escrever(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, taxa, true);
  v.setUint32(28, taxa * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  escrever(36, "data");
  v.setUint32(40, amostras.length * 2, true);
  for (let i = 0; i < amostras.length; i += 1) {
    const s = Math.max(-1, Math.min(1, amostras[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/* Legenda automática vai até 2 min: é o que cabe num envio para a Vercel. */
export const LIMITE_LEGENDA = 120;

/*
 * O áudio do vídeo editado, só com os trechos escolhidos e na
 * ordem da montagem, em 16 kHz mono. Assim o tempo de cada frase
 * que volta da transcrição já é o tempo do vídeo final.
 */
export async function audioDaMontagem(trechos: Trecho[]) {
  const taxa = 16000;
  const total = duracaoTotal(trechos);
  const decodificador = new AudioContext();
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(total * taxa)), taxa);

  let base = 0;
  let algumAudio = false;
  try {
    for (const t of trechos) {
      const duracao = Math.max(0, t.fim - t.inicio);
      try {
        const audio = await decodificador.decodeAudioData(await t.arquivo.arrayBuffer());
        const fonte = offline.createBufferSource();
        fonte.buffer = audio;
        fonte.connect(offline.destination);
        fonte.start(base, t.inicio, duracao);
        algumAudio = true;
      } catch {
        /* Trecho sem som (ou formato que o navegador não abre): fica em silêncio. */
      }
      base += duracao;
    }
  } finally {
    decodificador.close();
  }

  if (!algumAudio) return null;
  const pronto = await offline.startRendering();
  return wavDe(pronto.getChannelData(0), taxa);
}
