/*
 * AS CONTAS DO SCANNER
 *
 * Três passos, todos no próprio celular (nada sai do aparelho
 * antes de virar PDF):
 *
 *   1. endireitar: a foto do papel vem torta e em perspectiva.
 *      Com os 4 cantos marcados, cada ponto da folha "reta" é
 *      buscado na foto por uma homografia - a mesma conta que
 *      os apps de scanner fazem.
 *
 *   2. realçar: deixa o fundo branco e a letra escura. A luz
 *      sobre o papel nunca é igual (sombra do celular, lâmpada
 *      de um lado), então o branco de cada pedaço é medido ali
 *      mesmo e a página é dividida por ele - a sombra some sem
 *      apagar a letra.
 *
 *   3. o PDF fica no componente, com o pdf-lib que o sistema
 *      já usa.
 */

export type Ponto = { x: number; y: number };

/* Cantos na ordem: superior esquerdo, superior direito, inferior direito, inferior esquerdo. */
export type Quadrilatero = [Ponto, Ponto, Ponto, Ponto];

/* Maior lado da página endireitada: ~200 dpi numa folha A4. */
const MAIOR_LADO_DA_PAGINA = 2200;

/*
 * Resolve o sistema 8x8 da homografia que leva o retângulo
 * (0,0)-(L,A) até o quadrilátero da foto.
 */
function homografia(
  largura: number,
  altura: number,
  q: Quadrilatero
): number[] {
  const origem: Ponto[] = [
    { x: 0, y: 0 },
    { x: largura, y: 0 },
    { x: largura, y: altura },
    { x: 0, y: altura },
  ];

  const m: number[][] = [];

  for (let i = 0; i < 4; i++) {
    const { x, y } = origem[i];
    const { x: u, y: v } = q[i];
    m.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    m.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }

  /* Eliminação de Gauss com pivô parcial. */
  for (let col = 0; col < 8; col++) {
    let pivo = col;
    for (let lin = col + 1; lin < 8; lin++) {
      if (Math.abs(m[lin][col]) > Math.abs(m[pivo][col])) pivo = lin;
    }
    [m[col], m[pivo]] = [m[pivo], m[col]];

    for (let lin = 0; lin < 8; lin++) {
      if (lin === col) continue;
      const fator = m[lin][col] / m[col][col];
      for (let k = col; k < 9; k++) m[lin][k] -= fator * m[col][k];
    }
  }

  const h = m.map((linha, i) => linha[8] / linha[i]);
  return [...h, 1];
}

function distancia(a: Ponto, b: Ponto) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/*
 * Endireita a folha marcada pelos 4 cantos.
 *
 * O tamanho da página sai das próprias bordas marcadas (a maior
 * de cada par), para a folha não sair esticada nem achatada.
 */
export function endireitar(
  foto: HTMLCanvasElement,
  q: Quadrilatero
): HTMLCanvasElement {
  let largura = Math.max(distancia(q[0], q[1]), distancia(q[3], q[2]));
  let altura = Math.max(distancia(q[0], q[3]), distancia(q[1], q[2]));

  const escala = Math.min(1, MAIOR_LADO_DA_PAGINA / Math.max(largura, altura));
  largura = Math.max(1, Math.round(largura * escala));
  altura = Math.max(1, Math.round(altura * escala));

  const h = homografia(largura, altura, q);

  const origem = foto
    .getContext("2d")!
    .getImageData(0, 0, foto.width, foto.height);
  const fw = foto.width;
  const fh = foto.height;
  const de = origem.data;

  const saida = document.createElement("canvas");
  saida.width = largura;
  saida.height = altura;
  const ctx = saida.getContext("2d")!;
  const imagem = ctx.createImageData(largura, altura);
  const para = imagem.data;

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const w = h[6] * x + h[7] * y + h[8];
      let u = (h[0] * x + h[1] * y + h[2]) / w;
      let v = (h[3] * x + h[4] * y + h[5]) / w;

      if (u < 0) u = 0;
      if (v < 0) v = 0;
      if (u > fw - 1.001) u = fw - 1.001;
      if (v > fh - 1.001) v = fh - 1.001;

      /* Interpolação bilinear: letra sem serrilhado. */
      const x0 = u | 0;
      const y0 = v | 0;
      const dx = u - x0;
      const dy = v - y0;
      const i00 = (y0 * fw + x0) * 4;
      const i10 = i00 + 4;
      const i01 = i00 + fw * 4;
      const i11 = i01 + 4;
      const o = (y * largura + x) * 4;

      for (let c = 0; c < 3; c++) {
        const topo = de[i00 + c] + (de[i10 + c] - de[i00 + c]) * dx;
        const base = de[i01 + c] + (de[i11 + c] - de[i01 + c]) * dx;
        para[o + c] = topo + (base - topo) * dy;
      }
      para[o + 3] = 255;
    }
  }

  ctx.putImageData(imagem, 0, 0);
  return saida;
}

/*
 * O "modo documento": fundo branco, letra escura, sem sombra.
 */
export function realcar(pagina: HTMLCanvasElement): HTMLCanvasElement {
  const largura = pagina.width;
  const altura = pagina.height;
  const dados = pagina
    .getContext("2d")!
    .getImageData(0, 0, largura, altura).data;

  /* Cinza de cada ponto. */
  const cinza = new Float32Array(largura * altura);
  for (let i = 0, p = 0; i < cinza.length; i++, p += 4) {
    cinza[i] = 0.299 * dados[p] + 0.587 * dados[p + 1] + 0.114 * dados[p + 2];
  }

  /*
   * O branco do papel, pedaço por pedaço.
   *
   * Em blocos de 32 pontos, o "branco" de cada bloco é um dos
   * mais claros dali (não a média: a letra puxaria a média para
   * baixo e a própria letra clarearia). Depois os blocos são
   * suavizados entre os vizinhos, para não aparecer quadriculado.
   */
  const bloco = 32;
  const bl = Math.ceil(largura / bloco);
  const ba = Math.ceil(altura / bloco);
  const fundo = new Float32Array(bl * ba);

  for (let by = 0; by < ba; by++) {
    for (let bx = 0; bx < bl; bx++) {
      const valores: number[] = [];
      for (let y = by * bloco; y < Math.min(altura, (by + 1) * bloco); y += 2) {
        for (let x = bx * bloco; x < Math.min(largura, (bx + 1) * bloco); x += 2) {
          valores.push(cinza[y * largura + x]);
        }
      }
      valores.sort((a, b) => a - b);
      fundo[by * bl + bx] = valores[Math.floor(valores.length * 0.9)] || 255;
    }
  }

  const suave = new Float32Array(fundo.length);
  for (let passada = 0; passada < 2; passada++) {
    const de = passada === 0 ? fundo : suave.slice();
    for (let by = 0; by < ba; by++) {
      for (let bx = 0; bx < bl; bx++) {
        let soma = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const yy = by + dy;
            const xx = bx + dx;
            if (yy < 0 || xx < 0 || yy >= ba || xx >= bl) continue;
            soma += de[yy * bl + xx];
            n++;
          }
        }
        suave[by * bl + bx] = soma / n;
      }
    }
  }

  const saida = document.createElement("canvas");
  saida.width = largura;
  saida.height = altura;
  const ctx = saida.getContext("2d")!;
  const imagem = ctx.createImageData(largura, altura);
  const para = imagem.data;

  for (let y = 0; y < altura; y++) {
    /* Posição no grid de blocos, para interpolar o branco. */
    const gy = Math.min(ba - 1, Math.max(0, y / bloco - 0.5));
    const y0 = gy | 0;
    const y1 = Math.min(ba - 1, y0 + 1);
    const fy = gy - y0;

    for (let x = 0; x < largura; x++) {
      const gx = Math.min(bl - 1, Math.max(0, x / bloco - 0.5));
      const x0 = gx | 0;
      const x1 = Math.min(bl - 1, x0 + 1);
      const fx = gx - x0;

      const a = suave[y0 * bl + x0] + (suave[y0 * bl + x1] - suave[y0 * bl + x0]) * fx;
      const b = suave[y1 * bl + x0] + (suave[y1 * bl + x1] - suave[y1 * bl + x0]) * fx;
      const branco = Math.max(40, a + (b - a) * fy);

      /* Divide pelo branco do lugar e reforça o contraste. */
      let valor = (cinza[y * largura + x] / branco) * 255;
      valor = (valor - 70) * (255 / (240 - 70));
      if (valor < 0) valor = 0;
      if (valor > 255) valor = 255;

      const o = (y * largura + x) * 4;
      para[o] = para[o + 1] = para[o + 2] = valor;
      para[o + 3] = 255;
    }
  }

  ctx.putImageData(imagem, 0, 0);
  return saida;
}

/* Cantos iniciais: a foto inteira com uma margem, para o dedo achar. */
export function cantosIniciais(largura: number, altura: number): Quadrilatero {
  const mx = largura * 0.08;
  const my = altura * 0.08;
  return [
    { x: mx, y: my },
    { x: largura - mx, y: my },
    { x: largura - mx, y: altura - my },
    { x: mx, y: altura - my },
  ];
}
