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

/* 1 cm = 360000 EMU. A logo é quadrada (150x150). */
const LOGO_EMU = 1080000

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
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="120" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`

/*
 * Um parágrafo de texto.
 *
 * opcoes: { negrito, tamanho (em pontos), alinhamento,
 *           cor (hex sem #), espacoDepois, maiusculas }
 */
function paragrafo(texto, opcoes = {}) {
  const {
    negrito = false,
    tamanho = 11,
    alinhamento = 'left',
    cor = '000000',
    espacoDepois = 120,
    espacamentoLetras = 0,
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
    `<w:spacing w:after="${espacoDepois}" w:line="276" w:lineRule="auto"/>` +
    `<w:jc w:val="${alinhamento}"/>` +
    `</w:pPr>${conteudo}</w:p>`
  )
}

function escaparXml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function paragrafoLogo() {
  return (
    '<w:p><w:pPr>' +
    '<w:spacing w:after="60"/>' +
    '<w:jc w:val="center"/>' +
    '</w:pPr><w:r><w:drawing>' +
    `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${LOGO_EMU}" cy="${LOGO_EMU}"/>` +
    '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
    '<wp:docPr id="1" name="Logo Blackout Motos"/>' +
    '<wp:cNvGraphicFramePr/>' +
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
    '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:nvPicPr><pic:cNvPr id="1" name="logo.jpeg"/><pic:cNvPicPr/></pic:nvPicPr>' +
    '<pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
    '<pic:spPr><a:xfrm><a:off x="0" y="0"/>' +
    `<a:ext cx="${LOGO_EMU}" cy="${LOGO_EMU}"/></a:xfrm>` +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
    '</pic:pic></a:graphicData></a:graphic></wp:inline>' +
    '</w:drawing></w:r></w:p>'
  )
}

function linhaAssinatura(nome) {
  return (
    paragrafo(
      '______________________________________________',
      { alinhamento: 'center', espacoDepois: 40 }
    ) +
    paragrafo(nome, {
      alinhamento: 'center',
      negrito: true,
      tamanho: 10,
      espacoDepois: 320,
    })
  )
}

const corpo =
  paragrafoLogo() +
  paragrafo('BLACKOUT MOTOS', {
    alinhamento: 'center',
    negrito: true,
    tamanho: 18,
    espacoDepois: 40,
    espacamentoLetras: 40,
  }) +
  paragrafo('Avenida Andrômeda, 3521 - Bosque dos Eucaliptos', {
    alinhamento: 'center',
    tamanho: 9,
    cor: '444444',
    espacoDepois: 0,
  }) +
  paragrafo('São José dos Campos - SP - CEP 12233-000', {
    alinhamento: 'center',
    tamanho: 9,
    cor: '444444',
    espacoDepois: 360,
  }) +
  paragrafo('RECIBO', {
    alinhamento: 'center',
    negrito: true,
    tamanho: 16,
    espacoDepois: 360,
    espacamentoLetras: 60,
  }) +
  paragrafo(
    'Recebemos de {cliente_nome}, CPF {cliente_cpf}, telefone {cliente_telefone}, ' +
      'a quantia de R$ {valor_total} ({valor_extenso}), referente à compra de ' +
      '{quantidade} unidade(s) de {produto}, marca {marca}, modelo {modelo}, ' +
      'cor {cor}, tamanho {tamanho}, ao valor unitário de R$ {valor_unitario}.',
    { alinhamento: 'both', tamanho: 11, espacoDepois: 240 }
  ) +
  paragrafo('Forma de pagamento: {forma_pagamento}.', {
    alinhamento: 'both',
    espacoDepois: 240,
  }) +
  paragrafo(
    'São José dos Campos, {data_extenso}, às {hora_documento}.',
    { alinhamento: 'both', espacoDepois: 600 }
  ) +
  linhaAssinatura('BLACKOUT MOTOS') +
  linhaAssinatura('{cliente_nome}') +
  paragrafo('Vendedor: {vendedor}', {
    alinhamento: 'center',
    tamanho: 9,
    cor: '666666',
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
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418"
               w:header="708" w:footer="708" w:gutter="0"/>
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
