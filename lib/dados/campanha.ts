import { tituloDaMoto } from "@/lib/dados/moto-site";

/*
 * A CAMPANHA DO MÊS, MONTADA PELO SISTEMA
 *
 * A campanha de outubro de 2026 foi escrita à mão e funcionou,
 * mas escrever uma por mês vira trabalho que ninguém faz no
 * terceiro mês. O que ela tinha de bom era mecânico:
 *
 *   - os duelos saíam de pares de preço igual, e o estoque tem
 *     esses pares sozinho;
 *   - os rolês saíam de uma lista curta de estradas da região;
 *   - as legendas eram quatro moldes com a moto trocada dentro.
 *
 * Então é isso que este arquivo faz. Ele lê o pátio de hoje,
 * acha os pares, distribui pelas terças, quintas e sábados do
 * mês e escreve as legendas.
 *
 * O que ele NÃO faz, de propósito: publicar. Quem escolhe a
 * hora e responde o comentário é gente - e é a resposta que faz
 * o post render.
 */

export type CategoriaMoto = "scooter" | "trail" | "street";

export type MotoCampanha = {
  id: string;
  nome: string;
  preco: number;
  precoEscrito: string;
  ano: string;
  categoria: CategoriaMoto;
  capa: string;
  slug: string;
};

export type Formato = "duelo" | "avaliacao" | "carrossel" | "role";

export type Post = {
  /* Estável entre recargas: é por ele que se marca "postado". */
  chave: string;
  data: string;
  diaEscrito: string;
  formato: Formato;
  titulo: string;
  comoMontar: string;
  slides: string[];
  legenda: string[];
  motos: MotoCampanha[];
};

/* ------------------------------------------------------------ */
/* O QUE CADA MOTO É                                             */
/* ------------------------------------------------------------ */

/*
 * A categoria sai do nome, não de uma coluna do banco.
 *
 * Pôr mais um campo na ficha significaria alguém preencher moto
 * a moto, e errar. O modelo já diz: PCX é scooter, XRE é trail,
 * e o que não é nenhum dos dois é moto de rua.
 */
const SCOOTER = /\b(PCX|NMAX|BIZ|LEAD|ELITE|SH\s?150|BURGMAN|DAFRA\s?CITY)\b/i;
const TRAIL =
  /\b(XRE|XTZ|LANDER|CROSSER|NXR|BROS|SAHARA|TORNADO|TENERE|FALCON|DR\s?160)\b/i;

export function categoriaDaMoto(nome: string): CategoriaMoto {
  if (SCOOTER.test(nome)) return "scooter";
  if (TRAIL.test(nome)) return "trail";
  return "street";
}

/*
 * A frase que descreve a moto no duelo.
 *
 * Os modelos comuns do pátio têm frase própria, porque frase
 * genérica em post de loja soa a catálogo. O que não está na
 * lista cai na frase da categoria, que é verdadeira para
 * qualquer uma delas.
 */
const FRASE_POR_MODELO: Array<[RegExp, string]> = [
  [/\bFAN\b/i, "vai pro trabalho todo dia e aguenta o que vier"],
  [/\bTITAN\b/i, "qualquer mecânico sabe arrumar e qualquer um revende"],
  [/\bFACTOR\b|\bYBR\b/i, "gasta pouco e quase não dá trabalho"],
  [/\bTWISTER\b|\bCB\s?300\b/i, "é rua de verdade: semáforo, acelerada e freio bom"],
  [/\bFAZER\b|\bFZ\d/i, "tem jeito de esportiva e painel digital"],
  [/\bPCX\b/i, "te leva sentado, sem embreagem, com porta-capacete"],
  [/\bNMAX\b/i, "é scooter grande: estável na avenida e com espaço embaixo do banco"],
  [/\bXRE\b|\bSAHARA\b/i, "encara estrada de terra e viagem longa sem reclamar"],
  [/\bLANDER\b|\bXTZ\b/i, "é feita pra estrada: bagagem, serra e viagem"],
  [/\bBROS\b|\bNXR\b/i, "aguenta o asfalto e o trecho de terra que vem depois"],
  [/\bCROSSER\b/i, "encara buraco, lombada e estrada de terra sem reclamar"],
  [/\bBIZ\b/i, "é a mais fácil de pilotar que existe"],
];

const FRASE_POR_CATEGORIA: Record<CategoriaMoto, string> = {
  scooter: "é conforto puro: sem embreagem, consumo baixo e espaço pra bagagem",
  trail: "aguenta estrada ruim e ainda vai bem na cidade",
  street: "é moto de rua: leve, econômica e fácil de revender",
};

function fraseDaMoto(moto: MotoCampanha) {
  const achada = FRASE_POR_MODELO.find(([re]) => re.test(moto.nome));

  return achada ? achada[1] : FRASE_POR_CATEGORIA[moto.categoria];
}

/* ------------------------------------------------------------ */
/* AS ESTRADAS DA REGIÃO                                         */
/* ------------------------------------------------------------ */

/*
 * Lista curta e local. Rolê é o único post que as pessoas
 * compartilham, e compartilha-se o que se reconhece: quem mora
 * aqui já subiu a Tamoios e já tomou café em Monteiro Lobato.
 */
const ESTRADAS = [
  {
    nome: "Tamoios",
    linha:
      "Tamoios, descida pra Caraguá: 60 km de curva até o mar. Com a {moto} dá vontade de voltar pela serra só pra fazer de novo.",
    tags: "#tamoios #caraguatatuba",
  },
  {
    nome: "Monteiro Lobato",
    linha:
      "Monteiro Lobato fica a 40 minutos daqui e parece outro estado. Estrada de curva, café na praça, volta antes do almoço — e a {moto} dá conta do asfalto e do trecho de terra.",
    tags: "#monteirolobato",
  },
  {
    nome: "São Francisco Xavier",
    linha:
      "São Francisco Xavier: 50 km daqui, estrada de serra o caminho todo, e frio até no meio do dia. A {moto} foi feita pra esse tipo de domingo.",
    tags: "#saofranciscoxavier",
  },
  {
    nome: "Campos do Jordão",
    linha:
      "São 110 km daqui até Campos do Jordão, pela serra. Com a {moto}, o caminho vale tanto quanto chegar.",
    tags: "#camposdojordao",
  },
  {
    nome: "Paraibuna",
    linha:
      "A represa de Paraibuna fica a uma hora, e a estrada até lá é das melhores da região. A {moto} faz esse trecho sem esforço.",
    tags: "#paraibuna #represadeparaibuna",
  },
  {
    nome: "São Luiz do Paraitinga",
    linha:
      "São Luiz do Paraitinga: casario antigo, estrada boa e quase nenhum caminhão no caminho. Dia certo pra sair com a {moto}.",
    tags: "#saoluizdoparaitinga",
  },
  {
    nome: "Santo Antônio do Pinhal",
    linha:
      "Santo Antônio do Pinhal é subida, neblina e 14 graus no fim da tarde. A {moto} sobe tranquila.",
    tags: "#santoantoniodopinhal",
  },
  {
    nome: "Sertãozinho",
    linha:
      "A estrada do Sertãozinho começa aqui em São José e não precisa de dia inteiro: uma manhã de curva com a {moto} e você volta pro almoço.",
    tags: "#sertaozinho #saojosedoscampos",
  },
];

/* ------------------------------------------------------------ */
/* OS CARROSSÉIS                                                 */
/* ------------------------------------------------------------ */

const CARROSSEIS = [
  {
    titulo: "5 erros de quem compra a primeira moto",
    slides: [
      "Não conferir o chassi e o número do motor",
      "Olhar só a parcela, e não o total financiado",
      "Aceitar sem chave reserva e sem manual",
      "Deixar a transferência pra depois",
      "Escolher a cilindrada pelo orgulho, não pelo uso",
    ],
    legenda: [
      "Primeira moto? Esses cinco erros são os que mais custam caro depois.",
      "Arrasta pro lado, salva o post e volta nele na hora de fechar negócio.",
      "Qual desses você já viu acontecer? Comenta 👇",
      "#primeiramoto #dicasdemoto",
    ],
  },
  {
    titulo: "6 sinais de que a moto usada foi bem cuidada",
    slides: [
      "Corrente limpa e bem esticada",
      "Pneu com desenho igual dos dois lados",
      "Parafuso sem marca de chave errada",
      "Óleo limpo no visor",
      "Manual e chave reserva guardados",
      "Documento no nome de quem está vendendo",
    ],
    legenda: [
      "Dá pra saber muito sobre uma moto usada antes mesmo de ligar o motor.",
      "Esses seis sinais a gente confere em toda moto que entra aqui. Salva o post e usa quando for ver uma.",
      "Tem outro sinal que você olha? Comenta 👇",
      "#motousada #dicasdemoto",
    ],
  },
  {
    titulo: "4 perguntas que todo comprador devia fazer",
    slides: [
      "A moto tem quantos donos no documento?",
      "Quando foi a última revisão, e onde?",
      "Tem multa ou IPVA em aberto?",
      "Dá pra ver o laudo cautelar antes de fechar?",
    ],
    legenda: [
      "Quatro perguntas que separam a boa compra do arrependimento.",
      "Aqui a gente responde todas antes de você perguntar — e mostra o cautelar.",
      "Salva pra não esquecer nenhuma. Comenta se tem outra 👇",
      "#dicasdemoto #motousada",
    ],
  },
  {
    titulo: "5 coisas que a gente confere antes de pôr a moto à venda",
    slides: [
      "Cautelar e procedência do chassi",
      "Revisão em dia e óleo trocado",
      "Pneu, corrente e pastilha com vida",
      "Documento transferível na hora",
      "Chave reserva e manual com a moto",
    ],
    legenda: [
      "Nenhuma moto entra no nosso pátio sem passar por estes cinco pontos.",
      "É por isso que a gente consegue mostrar tudo antes de você decidir.",
      "Alguma outra coisa que você gostaria de ver conferida? Comenta 👇",
      "#blackoutmotos #motousada",
    ],
  },
];

/* ------------------------------------------------------------ */
/* AS ETIQUETAS                                                  */
/* ------------------------------------------------------------ */

const TAGS_FIXAS = "#motossjc #saojosedoscampos #blackoutmotos";

/*
 * Junta as etiquetas sem repetir.
 *
 * A estrada do Sertãozinho traz "#saojosedoscampos", e as fixas
 * trazem de novo - a linha saía com a mesma etiqueta duas
 * vezes, que o Instagram conta como erro e quem lê acha
 * desleixo.
 */
function juntarTags(...partes: string[]) {
  const vistas = new Set<string>();

  return partes
    .join(" ")
    .split(/\s+/)
    .filter((t) => t.startsWith("#"))
    .filter((t) => {
      const chave = t.toLowerCase();
      if (vistas.has(chave)) return false;
      vistas.add(chave);
      return true;
    })
    .join(" ");
}

/*
 * Os apelidos que as pessoas usam de verdade.
 *
 * Ninguém busca "#cb300ftwisterabs". Busca "#twister" e
 * "#cb300". A etiqueta boa é sigla + cilindrada, mais o apelido
 * quando a moto tem um.
 */
const APELIDOS =
  /\b(TWISTER|LANDER|FAZER|FACTOR|TITAN|CROSSER|BROS|SAHARA|TORNADO|ADVENTURE|BIZ|POP|FAN)\b/i;

function tagDoModelo(nome: string) {
  const semAcento = nome.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const palavras = semAcento.split(/\s+/).filter(Boolean);

  /* A primeira palavra é a marca; a segunda é a sigla. */
  const sigla = (palavras[1] || "").replace(/[^A-Za-z0-9]/g, "");

  /* A cilindrada pode vir colada na sigla (YBR150) ou solta
     logo depois (CG 160, CB 300F). */
  const numero = semAcento.match(/\b(\d{2,4})[A-Za-z]?\b/);

  const base = /\d/.test(sigla) ? sigla : sigla + (numero ? numero[1] : "");

  const achado = semAcento.match(APELIDOS);
  const apelido = achado ? achado[1].toLowerCase() : "";

  const etiquetas = [base.toLowerCase(), apelido]
    .filter(Boolean)
    /* "Crosser" é sigla e apelido ao mesmo tempo - não repete. */
    .filter((t, i, lista) => lista.indexOf(t) === i)
    .filter((t) => t.length > 2);

  return etiquetas.map((t) => "#" + t).join(" ");
}

/* ------------------------------------------------------------ */
/* OS DUELOS                                                     */
/* ------------------------------------------------------------ */

/*
 * Os pares de preço igual.
 *
 * O duelo só funciona quando o preço é o mesmo: "mesmo dinheiro,
 * qual você leva" é uma pergunta; "qual é melhor" é propaganda.
 *
 * A nota de cada par soma a diferença de preço com uma punição
 * para moto do mesmo tipo - duas street do mesmo preço é uma
 * escolha chata, scooter contra trail é conversa.
 */
function duelosPossiveis(motos: MotoCampanha[]) {
  const pares: Array<{ a: MotoCampanha; b: MotoCampanha; nota: number }> = [];

  for (let i = 0; i < motos.length; i++) {
    for (let j = i + 1; j < motos.length; j++) {
      const a = motos[i];
      const b = motos[j];
      const diferenca = Math.abs(a.preco - b.preco);

      /* Acima de três mil não é mais "mesmo preço". */
      if (diferenca > 3000) continue;

      const nota =
        diferenca / 1000 +
        (a.categoria === b.categoria ? 4 : 0) +
        (a.nome.split(" ")[0] === b.nome.split(" ")[0] ? 1 : 0);

      pares.push({ a, b, nota });
    }
  }

  return pares.sort((x, y) => x.nota - y.nota);
}

function escolherDuelos(motos: MotoCampanha[], quantos: number) {
  const pares = duelosPossiveis(motos);
  const usadas = new Set<string>();
  const escolhidos: Array<{ a: MotoCampanha; b: MotoCampanha }> = [];

  for (const par of pares) {
    if (escolhidos.length >= quantos) break;
    if (usadas.has(par.a.id) || usadas.has(par.b.id)) continue;

    usadas.add(par.a.id);
    usadas.add(par.b.id);
    escolhidos.push({ a: par.a, b: par.b });
  }

  return escolhidos;
}

/* ------------------------------------------------------------ */
/* O CALENDÁRIO                                                  */
/* ------------------------------------------------------------ */

const DIAS = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function nomeDoMes(mes: number) {
  return MESES[mes] || "";
}

function diasDoMes(ano: number, mes: number, diaSemana: number) {
  const dias: Date[] = [];
  const data = new Date(ano, mes, 1);

  while (data.getMonth() === mes) {
    if (data.getDay() === diaSemana) dias.push(new Date(data));
    data.setDate(data.getDate() + 1);
  }

  return dias;
}

const comoData = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const porExtenso = (d: Date) =>
  `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;

/* ------------------------------------------------------------ */
/* A MONTAGEM                                                    */
/* ------------------------------------------------------------ */

export function montarCampanha(
  motos: MotoCampanha[],
  ano: number,
  mes: number
): Post[] {
  const tercas = diasDoMes(ano, mes, 2);
  const quintas = diasDoMes(ano, mes, 4);
  const sabados = diasDoMes(ano, mes, 6);

  const duelos = escolherDuelos(motos, tercas.length);

  /* As trail abrem o rolê; sem nenhuma no pátio, vale qualquer
     uma - a estrada continua sendo a estrela do post. */
  const paraRole = [
    ...motos.filter((m) => m.categoria === "trail"),
    ...motos.filter((m) => m.categoria !== "trail"),
  ];

  const posts: Post[] = [];

  tercas.forEach((dia, i) => {
    const par = duelos[i];

    if (!par) return;

    const { a, b } = par;
    const mesmoPreco = a.preco === b.preco;

    posts.push({
      chave: comoData(dia),
      data: comoData(dia),
      diaEscrito: porExtenso(dia),
      formato: "duelo",
      titulo: "Duelo",
      comoMontar:
        "Carrossel de três: foto da primeira, foto da segunda, e no terceiro slide as duas lado a lado com o preço escrito.",
      slides: [],
      motos: [a, b],
      legenda: [
        mesmoPreco
          ? `Mesmo preço. ${a.precoEscrito} nas duas.`
          : `${a.precoEscrito} e ${b.precoEscrito}. Escolha difícil.`,
        `A ${a.nome} ${fraseDaMoto(a)}.`,
        `A ${b.nome} ${fraseDaMoto(b)}.`,
        "Qual você leva? Comenta A ou B 👇",
        juntarTags(tagDoModelo(a.nome), tagDoModelo(b.nome), TAGS_FIXAS),
      ],
    });
  });

  quintas.forEach((dia, i) => {
    /* Alterna: semana sim, semana não. Quatro "quanto vale" em
       seguida cansa, e quatro carrosséis não geram conversa. */
    const ehAvaliacao = i % 2 === 0;

    if (ehAvaliacao) {
      posts.push({
        chave: comoData(dia),
        data: comoData(dia),
        diaEscrito: porExtenso(dia),
        formato: "avaliacao",
        titulo: "Quanto vale a sua",
        comoMontar:
          "Sem moto: fundo preto com a pergunta escrita, ou um vídeo de dez segundos andando pelo pátio.",
        slides: [],
        motos: [],
        legenda: [
          "Quanto vale a sua moto na troca?",
          "Comenta o modelo, o ano e a quilometragem. A gente responde com a faixa.",
          "Avaliação de verdade é com a moto na frente, aqui na loja — mas dá pra adiantar a conversa por aqui.",
          "Av. Andrômeda, 3521 · Bosque dos Eucaliptos",
          juntarTags("#trocademoto #valedoparaiba", TAGS_FIXAS),
        ],
      });

      return;
    }

    const carrossel = CARROSSEIS[Math.floor(i / 2) % CARROSSEIS.length];

    posts.push({
      chave: comoData(dia),
      data: comoData(dia),
      diaEscrito: porExtenso(dia),
      formato: "carrossel",
      titulo: carrossel.titulo,
      comoMontar:
        "Texto grande sobre fundo preto, um item por slide, capa com o título. Se der, foto de verdade de cada item numa moto do pátio.",
      slides: [`Capa: ${carrossel.titulo}`, ...carrossel.slides],
      motos: [],
      legenda: [
        ...carrossel.legenda.slice(0, -1),
        juntarTags(carrossel.legenda[carrossel.legenda.length - 1], TAGS_FIXAS),
      ],
    });
  });

  sabados.forEach((dia, i) => {
    /* A estrada gira com o mês, senão todo mês sairia Tamoios. */
    const estrada = ESTRADAS[(mes * 2 + i) % ESTRADAS.length];
    const moto = paraRole[i % Math.max(paraRole.length, 1)];

    if (!moto) return;

    posts.push({
      chave: comoData(dia),
      data: comoData(dia),
      diaEscrito: porExtenso(dia),
      formato: "role",
      titulo: `Rolê — ${estrada.nome}`,
      comoMontar:
        "Foto da moto na rua, não no pátio. Se tiver foto da estrada, melhor ainda — a estrada é a estrela do post.",
      slides: [],
      motos: [moto],
      legenda: [
        "Fim de semana chegando. Já sabe pra onde vai?",
        estrada.linha.replace("{moto}", moto.nome),
        "Qual rolê você faria com essa? 👇",
        juntarTags(estrada.tags, tagDoModelo(moto.nome), TAGS_FIXAS),
      ],
    });
  });

  return posts.sort((a, b) => a.data.localeCompare(b.data));
}

/* ------------------------------------------------------------ */
/* DO BANCO PARA A CAMPANHA                                      */
/* ------------------------------------------------------------ */

type LinhaDoBanco = {
  id: string | number;
  marca?: string | null;
  modelo?: string | null;
  versao?: string | null;
  ano_modelo?: string | number | null;
  preco_anunciado?: string | number | null;
};

export function prepararMotos(
  linhas: LinhaDoBanco[],
  capas: Record<string, string>
): MotoCampanha[] {
  return linhas
    .map((linha) => {
      const nome = tituloDaMoto(
        [linha.marca, linha.modelo, linha.versao]
          .map((p) => String(p || "").trim())
          .filter(Boolean)
          .join(" ")
      );

      const preco = Number(linha.preco_anunciado) || 0;

      return {
        id: String(linha.id),
        nome,
        preco,
        precoEscrito: preco.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 0,
        }),
        ano: linha.ano_modelo ? String(linha.ano_modelo) : "",
        categoria: categoriaDaMoto(nome),
        capa: capas[String(linha.id)] || "",
        slug: "",
      };
    })
    /* Moto sem preço não entra: o duelo inteiro é sobre preço. */
    .filter((m) => m.preco > 0 && m.nome);
}
