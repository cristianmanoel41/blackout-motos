/*
 * Valor em reais por extenso.
 *
 * Exemplo:
 *   valorPorExtenso(450)     -> "QUATROCENTOS E CINQUENTA REAIS"
 *   valorPorExtenso(1231.5)  -> "MIL, DUZENTOS E TRINTA E UM REAIS E CINQUENTA CENTAVOS"
 */

const unidades = [
  '',
  'UM',
  'DOIS',
  'TRÊS',
  'QUATRO',
  'CINCO',
  'SEIS',
  'SETE',
  'OITO',
  'NOVE',
  'DEZ',
  'ONZE',
  'DOZE',
  'TREZE',
  'QUATORZE',
  'QUINZE',
  'DEZESSEIS',
  'DEZESSETE',
  'DEZOITO',
  'DEZENOVE',
]

const dezenas = [
  '',
  '',
  'VINTE',
  'TRINTA',
  'QUARENTA',
  'CINQUENTA',
  'SESSENTA',
  'SETENTA',
  'OITENTA',
  'NOVENTA',
]

const centenas = [
  '',
  'CENTO',
  'DUZENTOS',
  'TREZENTOS',
  'QUATROCENTOS',
  'QUINHENTOS',
  'SEISCENTOS',
  'SETECENTOS',
  'OITOCENTOS',
  'NOVECENTOS',
]

/*
 * Converte um número de 1 a 999 por extenso.
 */
function ateNovecentosENoventaENove(numero: number): string {
  if (numero <= 0) return ''

  if (numero === 100) return 'CEM'

  if (numero < 20) return unidades[numero]

  if (numero < 100) {
    const dezena = Math.floor(numero / 10)
    const resto = numero % 10

    return resto === 0
      ? dezenas[dezena]
      : `${dezenas[dezena]} E ${unidades[resto]}`
  }

  const centena = Math.floor(numero / 100)
  const resto = numero % 100

  return resto === 0
    ? centenas[centena]
    : `${centenas[centena]} E ${ateNovecentosENoventaENove(resto)}`
}

/*
 * Converte um inteiro por extenso (até bilhões).
 */
function inteiroPorExtenso(numero: number): string {
  if (numero === 0) return 'ZERO'

  const grupos: { valor: number; singular: string; plural: string }[] = [
    { valor: 1_000_000_000, singular: 'BILHÃO', plural: 'BILHÕES' },
    { valor: 1_000_000, singular: 'MILHÃO', plural: 'MILHÕES' },
    { valor: 1_000, singular: 'MIL', plural: 'MIL' },
  ]

  const partes: string[] = []
  let restante = numero

  for (const grupo of grupos) {
    const quantidade = Math.floor(restante / grupo.valor)

    if (quantidade > 0) {
      const nome =
        quantidade === 1 ? grupo.singular : grupo.plural

      /*
       * "MIL" não leva "UM" na frente: 1000 = MIL.
       */
      const prefixo =
        grupo.valor === 1_000 && quantidade === 1
          ? ''
          : `${ateNovecentosENoventaENove(quantidade)} `

      partes.push(`${prefixo}${nome}`)
      restante = restante % grupo.valor
    }
  }

  if (restante > 0) {
    partes.push(ateNovecentosENoventaENove(restante))
  }

  if (partes.length === 1) return partes[0]

  /*
   * O último grupo entra com "E" quando é menor que cem
   * ou múltiplo exato de cem (regra usual do português).
   */
  const ultimo = partes[partes.length - 1]
  const anteriores = partes.slice(0, -1)

  const ultimoValor = restante

  const ligacao =
    ultimoValor > 0 && (ultimoValor < 100 || ultimoValor % 100 === 0)
      ? ' E '
      : ', '

  return restante > 0
    ? `${anteriores.join(', ')}${ligacao}${ultimo}`
    : partes.join(', ')
}

export function valorPorExtenso(valor: number | null | undefined): string {
  const numero = Number(valor) || 0

  /*
   * Arredonda em centavos para não perder 1 centavo
   * por causa de ponto flutuante.
   */
  const centavosTotais = Math.round(Math.abs(numero) * 100)

  const reais = Math.floor(centavosTotais / 100)
  const centavos = centavosTotais % 100

  const partes: string[] = []

  if (reais > 0) {
    /*
     * Milhão/bilhão redondo pede "DE REAIS":
     * "UM MILHÃO DE REAIS", "DOIS BILHÕES DE REAIS".
     */
    const milhaoRedondo =
      reais >= 1_000_000 && reais % 1_000_000 === 0

    const moedaExtenso =
      reais === 1
        ? 'REAL'
        : milhaoRedondo
          ? 'DE REAIS'
          : 'REAIS'

    partes.push(
      `${inteiroPorExtenso(reais)} ${moedaExtenso}`
    )
  }

  if (centavos > 0) {
    partes.push(
      `${inteiroPorExtenso(centavos)} ${
        centavos === 1 ? 'CENTAVO' : 'CENTAVOS'
      }`
    )
  }

  if (partes.length === 0) return 'ZERO REAL'

  return partes.join(' E ')
}
