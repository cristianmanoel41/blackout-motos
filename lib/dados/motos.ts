/*
 * Catálogo de marcas e modelos de moto.
 *
 * Serve para o cadastro de moto sugerir marca e modelo em vez
 * de digitar tudo na mão, o que também mantém a grafia igual
 * entre uma moto e outra (importa na busca do estoque).
 *
 * NÃO é uma lista oficial nem completa: é um ponto de partida
 * com o que roda no mercado brasileiro. Por isso os campos
 * continuam aceitando texto livre - se faltar um modelo, é só
 * digitar e seguir. Para incluir de vez, acrescente aqui.
 */

export type MarcaDeMoto = {
  nome: string
  modelos: string[]
}

export const MARCAS_DE_MOTO: MarcaDeMoto[] = [
  {
    nome: 'Honda',
    modelos: [
      'Biz 110i',
      'Biz 125',
      'Bros 160',
      'CB 300F Twister',
      'CB 500F',
      'CB 500X',
      'CB 600F Hornet',
      'CB 650R',
      'CB Twister 250',
      'CBR 500R',
      'CBR 600RR',
      'CBR 650R',
      'CG 125 Fan',
      'CG 160 Cargo',
      'CG 160 Fan',
      'CG 160 Start',
      'CG 160 Titan',
      'CRF 230F',
      'CRF 250F',
      'CRF 1100L Africa Twin',
      'Elite 125',
      'NC 750X',
      'NX 400 Falcon',
      'NXR 160 Bros',
      'PCX 160',
      'Pop 110i',
      'SH 300i',
      'XRE 190',
      'XRE 300',
      'XRE 300 Sahara',
      'XR 300L Sahara',
    ],
  },
  {
    nome: 'Yamaha',
    modelos: [
      'Crosser 150',
      'Factor 125',
      'Factor 150',
      'Fazer 250',
      'Fluo 125',
      'Lander 250',
      'MT-03',
      'MT-07',
      'MT-09',
      'NEO 125',
      'NMAX 160',
      'R3',
      'R6',
      'R1',
      'Tenere 250',
      'Tenere 700',
      'Tracer 900',
      'XJ6',
      'XMAX 250',
      'XT 660R',
      'XTZ 150 Crosser',
      'XTZ 250 Lander',
      'YBR 125',
      'YS 250 Fazer',
      'YZF-R15',
    ],
  },
  {
    nome: 'Suzuki',
    modelos: [
      'Bandit 600',
      'Bandit 650',
      'Burgman 125',
      'DL 650 V-Strom',
      'DL 1000 V-Strom',
      'GSX-S 750',
      'GSX-S 1000',
      'GSX-R 750',
      'GSX-R 1000',
      'GSX 8S',
      'Gladius 650',
      'Intruder 125',
      'Marauder 800',
      'V-Strom 1050',
      'Yes 125',
    ],
  },
  {
    nome: 'Kawasaki',
    modelos: [
      'Er-6n',
      'Ninja 300',
      'Ninja 400',
      'Ninja 650',
      'Ninja ZX-6R',
      'Ninja ZX-10R',
      'Ninja 1000SX',
      'Versys 650',
      'Versys 1000',
      'Vulcan S',
      'Z400',
      'Z650',
      'Z750',
      'Z800',
      'Z900',
      'Z1000',
    ],
  },
  {
    nome: 'BMW',
    modelos: [
      'F 700 GS',
      'F 750 GS',
      'F 800 GS',
      'F 850 GS',
      'F 900 R',
      'G 310 GS',
      'G 310 R',
      'R 1200 GS',
      'R 1250 GS',
      'R 1250 GS Adventure',
      'S 1000 RR',
      'S 1000 XR',
    ],
  },
  {
    nome: 'Harley-Davidson',
    modelos: [
      'Fat Bob',
      'Fat Boy',
      'Forty-Eight',
      'Heritage Classic',
      'Iron 883',
      'Road King',
      'Softail Standard',
      'Sportster S',
      'Street Bob',
      'Street Glide',
      'V-Rod',
    ],
  },
  {
    nome: 'Royal Enfield',
    modelos: [
      'Classic 350',
      'Continental GT 650',
      'Himalayan 411',
      'Hunter 350',
      'Interceptor 650',
      'Meteor 350',
      'Scram 411',
    ],
  },
  {
    nome: 'Triumph',
    modelos: [
      'Bonneville T100',
      'Bonneville T120',
      'Speed Twin',
      'Speed Triple',
      'Street Triple',
      'Tiger 800',
      'Tiger 900',
      'Trident 660',
      'Tiger Sport 660',
    ],
  },
  {
    nome: 'Ducati',
    modelos: [
      'Diavel',
      'Hypermotard',
      'Monster 797',
      'Monster 821',
      'Multistrada 950',
      'Multistrada V4',
      'Panigale V2',
      'Panigale V4',
      'Scrambler Icon',
    ],
  },
  {
    nome: 'KTM',
    modelos: [
      '200 Duke',
      '250 Duke',
      '390 Adventure',
      '390 Duke',
      '790 Duke',
      '890 Adventure',
      '1290 Super Duke',
      'RC 390',
    ],
  },
  {
    nome: 'Haojue',
    modelos: [
      'Chopper Road 150',
      'DK 150',
      'DK 160',
      'Master Ride 150',
      'NK 150',
      'UM 150',
    ],
  },
  {
    nome: 'Shineray',
    modelos: [
      'Discover 50',
      'Jet 50',
      'Phoenix 50',
      'SHI 175',
      'Worker 125',
      'XY 50Q',
    ],
  },
  {
    nome: 'Dafra',
    modelos: [
      'Apache 150',
      'Citycom 300i',
      'Horizon 150',
      'Kansas 150',
      'Next 250',
      'Speed 150',
      'Riva 150',
    ],
  },
  {
    nome: 'Kasinski',
    modelos: [
      'Comet 150',
      'Comet 250',
      'Mirage 150',
      'Mirage 250',
      'Prima 150',
      'Seta 125',
      'Win 110',
    ],
  },
  {
    nome: 'Sundown',
    modelos: [
      'Future 125',
      'Hunter 90',
      'Max 125',
      'STX 200',
      'Web 100',
    ],
  },
  {
    nome: 'Traxx',
    modelos: [
      'Fly 50',
      'JH 125',
      'Star 50',
      'TSS 150',
      'Work 125',
    ],
  },
  {
    nome: 'Voltz',
    modelos: ['EV1', 'EV1 Sport', 'EVS', 'EVS Work'
  ],
  },
  {
    nome: 'Piaggio',
    modelos: ['Beverly 300', 'Liberty 150', 'Medley 150'
  ],
  },
  {
    nome: 'Vespa',
    modelos: ['Primavera 150', 'Sprint 150', 'GTS 300'
  ],
  },
  {
    nome: 'Kymco',
    modelos: ['Agility 125', 'Downtown 300i', 'Like 150'
  ],
  },
]

export const MARCAS = MARCAS_DE_MOTO.map(
  (marca) => marca.nome
)

function semAcento(valor?: string | null) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/*
 * Modelos da marca escolhida. Marca digitada à mão, fora do
 * catálogo, devolve lista vazia - o campo de modelo continua
 * aceitando texto livre.
 */
export function modelosDaMarca(marca?: string | null) {
  const alvo = semAcento(marca)

  if (!alvo) return []

  const encontrada = MARCAS_DE_MOTO.find(
    (item) => semAcento(item.nome) === alvo
  )

  return encontrada ? encontrada.modelos : []
}

/*
 * VERSÕES
 *
 * Versão é o acabamento do modelo: ABS, ESDi, Flex, Rally...
 * A lista abaixo é o que aparece com mais frequência nas notas
 * e nos documentos. Assim como os modelos, NÃO é oficial: o
 * campo aceita texto livre e o que for digitado vale.
 */

export const VERSOES_COMUNS = [
  'ABS',
  'CBS',
  'UBS',
  'Std',
  'ESD',
  'ESDi',
  'EX',
  'Flex',
  'BlueFlex',
  'Sport',
  'Touring',
  'Adventure',
  'Rally',
  'Special Edition',
  'Limited',
] as const

/*
 * Versões próprias de alguns modelos, pela chave "Marca|Modelo".
 * O que não estiver aqui usa a lista comum acima.
 */
export const VERSOES_POR_MODELO: Record<string, string[]> = {
  'Honda|Biz 125': ['ES', 'EX'],
  'Honda|CG 160 Fan': ['ESDi', 'Flex'],
  'Honda|CG 160 Titan': ['S', 'EX', 'Flex'],
  'Honda|PCX 160': ['DLX', 'Sport', 'Touring'],
  'Honda|XRE 300': ['ABS', 'Rally', 'Sahara'],
  'Honda|CB 500X': ['ABS'],
  'Yamaha|Factor 150': ['ED', 'UBS', 'BlueFlex'],
  'Yamaha|Fazer 250': ['ABS', 'BlueFlex', 'Limited'],
  'Yamaha|NMAX 160': ['ABS', 'Connected'],
  'Yamaha|Crosser 150': ['S', 'Z', 'ABS'],
  'Yamaha|Lander 250': ['ABS', 'BlueFlex'],
}

/*
 * Versões sugeridas para a marca e o modelo escolhidos.
 */
export function versoesDoModelo(
  marca?: string | null,
  modelo?: string | null
): string[] {
  const nomeMarca = String(marca || '').trim()
  const nomeModelo = String(modelo || '').trim()

  if (!nomeModelo) return [...VERSOES_COMUNS]

  const chave = Object.keys(VERSOES_POR_MODELO).find(
    (item) =>
      semAcento(item) ===
      semAcento(`${nomeMarca}|${nomeModelo}`)
  )

  if (!chave) return [...VERSOES_COMUNS]

  /*
   * As específicas primeiro, e as comuns na sequência sem
   * repetir - ABS e Flex servem para quase tudo.
   */
  const especificas = VERSOES_POR_MODELO[chave]

  const restantes = VERSOES_COMUNS.filter(
    (versao) =>
      !especificas.some(
        (item) => semAcento(item) === semAcento(versao)
      )
  )

  return [...especificas, ...restantes]
}
