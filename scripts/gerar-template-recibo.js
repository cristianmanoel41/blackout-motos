/*
 * Gera o modelo Word do recibo de venda de capacete:
 *
 *   public/templates/recibo-capacete.docx
 *
 * Rode com:  node scripts/gerar-template-recibo.js
 *
 * O arquivo gerado é um .docx normal: pode ser aberto e
 * ajustado no Word. Só não troque os campos entre chaves,
 * porque é neles que a rota /api/recibos/capacete/[id]
 * escreve os dados da venda.
 *
 * TAMANHO: 21 x 9,9 cm - um terço da folha A4, o tamanho de
 * talão de recibo. A largura é a mesma do A4, então saem três
 * por folha e é só cortar.
 * Para voltar ao A4 inteiro, troque PAGINA por PAGINA_A4
 * lá embaixo, no <w:sectPr>.
 *
 * A logo vem de public/logo-blackout.png (o arquivo está
 * salvo em JPEG, apesar do nome .png - por isso ele entra
 * no documento como image/jpeg).
 */

const fs = require('node:fs')
const path = require('node:path')
const PizZip = require('pizzip')

const raiz = path.join(__dirname, '..')

const caminhoLogo = path.join(raiz, 'public', 'logo-blackout.png')

const destino = path.join(
  raiz,
  'public',
  'templates',
  'recibo-capacete.docx'
)

/* Medidas: 1 cm = 566,93 twips (página) e 360000 EMU (imagem). */
const cm = (valor) => Math.round(valor * 566.93)

/* Um terço de A4: 21 x 9,9 cm. */
const PAGINA = {
  largura: cm(21),
  altura: cm(9.9),
  orientacao: 'landscape',
  margemVertical: cm(0.6),
  margemHorizontal: cm(1),
}

/* Deixado pronto caso um dia queira o recibo em folha inteira. */
// const PAGINA_A4 = {
//   largura: cm(21),
//   altura: cm(29.7),
//   orientacao: 'portrait',
//   margemVertical: cm(2),
//   margemHorizontal: cm(2),
// }

/*
 * Logo do cabeçalho (360000 EMU por cm).
 * Mais larga que alta de propósito: o arquivo é quadrado,
 * então ela sai esticada na horizontal, ocupando melhor a
 * largura da folha. Para voltar ao formato original, use a
 * mesma medida nos dois.
 */
const LOGO_LARGURA_EMU = Math.round(2.4 * 360000)
const LOGO_ALTURA_EMU = Math.round(1.2 * 360000)

/* Largura útil da página, dividida entre as duas assinaturas. */
const LARGURA_UTIL =
  PAGINA.largura - PAGINA.margemHorizontal * 2

/*
 * A tabela das assinaturas fica um pouco mais estreita que a
 * largura útil, para nenhuma célula encostar na margem.
 */
const LARGURA_TABELA = LARGURA_UTIL - cm(1)

const COLUNA_ASSINATURA = Math.floor(
  LARGURA_TABELA / 2
)

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`

const relsPrincipais = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

const relsDocumento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.jpeg"/>
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:sz w:val="19"/>
        <w:szCs w:val="19"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="60" w:line="240" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`

function escaparXml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/*
 * Um parágrafo de texto.
 *
 * opcoes: { negrito, tamanho (pontos), alinhamento, cor (hex
 *           sem #), espacoDepois (twips), espacamentoLetras,
 *           entrelinha }
 */
function paragrafo(texto, opcoes = {}) {
  const {
    negrito = false,
    tamanho = 9.5,
    alinhamento = 'left',
    cor = '000000',
    espacoAntes = 0,
    espacoDepois = 60,
    espacamentoLetras = 0,
    entrelinha = 240,
  } = opcoes

  const meiosPontos = Math.round(tamanho * 2)

  const runProps = [
    '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>',
    negrito ? '<w:b/>' : '',
    `<w:color w:val="${cor}"/>`,
    `<w:sz w:val="${meiosPontos}"/>`,
    `<w:szCs w:val="${meiosPontos}"/>`,
    espacamentoLetras
      ? `<w:spacing w:val="${espacamentoLetras}"/>`
      : '',
  ].join('')

  const conteudo = texto
    ? `<w:r><w:rPr>${runProps}</w:rPr><w:t xml:space="preserve">${escaparXml(
        texto
      )}</w:t></w:r>`
    : ''

  return (
    `<w:p><w:pPr>` +
    `<w:spacing w:before="${espacoAntes}" w:after="${espacoDepois}" w:line="${entrelinha}" w:lineRule="auto"/>` +
    `<w:jc w:val="${alinhamento}"/>` +
    `</w:pPr>${conteudo}</w:p>`
  )
}

function paragrafoLogo() {
  return (
    '<w:p><w:pPr>' +
    '<w:spacing w:after="20"/>' +
    '<w:jc w:val="center"/>' +
    '</w:pPr><w:r><w:drawing>' +
    `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${LOGO_LARGURA_EMU}" cy="${LOGO_ALTURA_EMU}"/>` +
    '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
    '<wp:docPr id="1" name="Logo Blackout Motos"/>' +
    '<wp:cNvGraphicFramePr/>' +
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
    '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:nvPicPr><pic:cNvPr id="1" name="logo.jpeg"/><pic:cNvPicPr/></pic:nvPicPr>' +
    '<pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
    '<pic:spPr><a:xfrm><a:off x="0" y="0"/>' +
    `<a:ext cx="${LOGO_LARGURA_EMU}" cy="${LOGO_ALTURA_EMU}"/></a:xfrm>` +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
    '</pic:pic></a:graphicData></a:graphic></wp:inline>' +
    '</w:drawing></w:r></w:p>'
  )
}

/*
 * Linha divisória fina, no lugar do espaço em branco que
 * separava o cabeçalho do corpo no formato A4.
 */
function divisoria() {
  return (
    '<w:p><w:pPr>' +
    '<w:spacing w:before="20" w:after="90"/>' +
    '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="BBBBBB"/></w:pBdr>' +
    '</w:pPr></w:p>'
  )
}

/*
 * As duas assinaturas lado a lado, numa tabela sem bordas.
 * Em pé, uma embaixo da outra, não caberia no A5.
 *
 * A linha da assinatura é a borda de baixo de um parágrafo
 * vazio, e não uma fileira de underscores: assim ela tem
 * exatamente a largura da coluna e nunca empurra o nome
 * para fora da célula, por mais longo que ele seja.
 */
function linhaDeAssinatura() {
  return (
    '<w:p><w:pPr>' +
    '<w:spacing w:before="0" w:after="40" w:line="240" w:lineRule="auto"/>' +
    '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="000000"/></w:pBdr>' +
    '</w:pPr></w:p>'
  )
}

function assinaturasLadoALado(esquerda, direita) {
  const celula = (nome) =>
    '<w:tc>' +
    `<w:tcPr><w:tcW w:w="${COLUNA_ASSINATURA}" w:type="dxa"/>` +
    '<w:tcBorders>' +
    ['top', 'left', 'bottom', 'right']
      .map(
        (lado) =>
          `<w:${lado} w:val="nil"/>`
      )
      .join('') +
    '</w:tcBorders>' +
    '<w:tcMar>' +
    '<w:left w:w="113" w:type="dxa"/>' +
    '<w:right w:w="113" w:type="dxa"/>' +
    '</w:tcMar></w:tcPr>' +
    linhaDeAssinatura() +
    paragrafo(nome, {
      alinhamento: 'center',
      negrito: true,
      tamanho: 7.5,
      espacoDepois: 0,
    }) +
    '</w:tc>'

  return (
    '<w:tbl>' +
    '<w:tblPr>' +
    `<w:tblW w:w="${LARGURA_TABELA}" w:type="dxa"/>` +
    '<w:jc w:val="center"/>' +
    '<w:tblBorders>' +
    [
      'top',
      'left',
      'bottom',
      'right',
      'insideH',
      'insideV',
    ]
      .map((lado) => `<w:${lado} w:val="nil"/>`)
      .join('') +
    '</w:tblBorders>' +
    '<w:tblCellMar>' +
    '<w:left w:w="113" w:type="dxa"/>' +
    '<w:right w:w="113" w:type="dxa"/>' +
    '</w:tblCellMar>' +
    '<w:tblLayout w:type="fixed"/>' +
    '</w:tblPr>' +
    '<w:tblGrid>' +
    `<w:gridCol w:w="${COLUNA_ASSINATURA}"/>` +
    `<w:gridCol w:w="${COLUNA_ASSINATURA}"/>` +
    '</w:tblGrid>' +
    '<w:tr>' +
    celula(esquerda) +
    celula(direita) +
    '</w:tr>' +
    '</w:tbl>'
  )
}

const corpo =
  paragrafoLogo() +
  paragrafo('BLACKOUT MOTOS', {
    alinhamento: 'center',
    negrito: true,
    tamanho: 12,
    espacoDepois: 0,
    espacamentoLetras: 30,
  }) +
  paragrafo(
    'Avenida Andrômeda, 3521 - Bosque dos Eucaliptos - São José dos Campos/SP - CEP 12233-000',
    {
      alinhamento: 'center',
      tamanho: 6.5,
      cor: '444444',
      espacoDepois: 20,
    }
  ) +
  paragrafo('RECIBO', {
    alinhamento: 'center',
    negrito: true,
    tamanho: 10,
    espacoAntes: 60,
    espacoDepois: 0,
    espacamentoLetras: 50,
  }) +
  divisoria() +
  paragrafo(
    'Recebemos de {cliente_nome}, CPF {cliente_cpf}, telefone {cliente_telefone}, ' +
      'a quantia de {valor_total} ({valor_extenso}), referente à compra de ' +
      '{quantidade} unidade(s) de {produto}, marca {marca}, modelo {modelo}, ' +
      'cor {cor}, tamanho {tamanho}, ao valor unitário de {valor_unitario}.',
    { alinhamento: 'both', tamanho: 8.5, espacoDepois: 80 }
  ) +
  paragrafo('Forma de pagamento: {forma_pagamento}.', {
    alinhamento: 'both',
    tamanho: 8.5,
    espacoDepois: 80,
  }) +
  paragrafo(
    'São José dos Campos, {data_extenso}, às {hora_documento}.',
    { alinhamento: 'both', tamanho: 8.5, espacoDepois: 280 }
  ) +
  assinaturasLadoALado('BLACKOUT MOTOS', '{cliente_nome}') +
  paragrafo('Vendedor: {vendedor}', {
    alinhamento: 'center',
    tamanho: 6.5,
    cor: '666666',
    espacoAntes: 60,
    espacoDepois: 0,
  })

const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
  <w:body>
    ${corpo}
    <w:sectPr>
      <w:pgSz w:w="${PAGINA.largura}" w:h="${PAGINA.altura}" w:orient="${PAGINA.orientacao}"/>
      <w:pgMar w:top="${PAGINA.margemVertical}" w:right="${PAGINA.margemHorizontal}"
               w:bottom="${PAGINA.margemVertical}" w:left="${PAGINA.margemHorizontal}"
               w:header="0" w:footer="0" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`

const zip = new PizZip()

zip.file('[Content_Types].xml', contentTypes)
zip.folder('_rels').file('.rels', relsPrincipais)

const word = zip.folder('word')
word.file('document.xml', documento)
word.file('styles.xml', estilos)
word.folder('_rels').file('document.xml.rels', relsDocumento)
word.folder('media').file('logo.jpeg', fs.readFileSync(caminhoLogo))

fs.mkdirSync(path.dirname(destino), { recursive: true })

fs.writeFileSync(
  destino,
  zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })
)

console.log(`Template gerado: ${destino}`)
console.log(
  `Pagina: ${(PAGINA.largura / 566.93).toFixed(1)} x ${(
    PAGINA.altura / 566.93
  ).toFixed(1)} cm (${PAGINA.orientacao})`
)
