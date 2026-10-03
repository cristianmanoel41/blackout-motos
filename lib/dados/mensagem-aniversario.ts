/*
 * A MENSAGEM DE ANIVERSÁRIO
 *
 * Mora sozinha, longe de aniversariantes.ts, porque este texto
 * é usado nos dois lados: no painel, que é servidor, e na ficha
 * do cliente, que é tela de navegador.
 *
 * O arquivo aniversariantes.ts fala com o banco e importa o
 * Supabase de servidor, que usa next/headers. Quando a ficha do
 * cliente importou a mensagem de lá, trouxe junto todo esse
 * caminho para dentro do navegador - e o build de produção
 * recusou, em 02/10/2026. O `tsc` não pega isso: para ele os
 * tipos batem, e a fronteira entre servidor e cliente não é
 * tipo, é empacotamento.
 *
 * Aqui dentro não pode entrar nada além de texto. Qualquer
 * import de banco, de cookie ou de ambiente reabre o problema.
 */

/*
 * Só o primeiro nome: "Parabéns, José Carlos da Silva Santos"
 * soa a cobrança, não a felicitação. Sem oferta junto -
 * mensagem de aniversário que vende vira propaganda, e o
 * cliente sente.
 *
 * Vai em três parágrafos e não numa linha só. Mensagem de
 * felicitação espremida num parágrafo parece aviso de sistema;
 * com respiro, parece gente. O WhatsApp respeita a quebra.
 *
 * O fecho sobre estrada é o que faz a mensagem ser DESTA loja e
 * não de qualquer uma - é a única liberdade que a mensagem toma,
 * e ela não vende nada.
 */
export function mensagemDeAniversario(nome: string) {
  const primeiro = String(nome || "")
    .trim()
    .split(/\s+/)[0];

  return (
    `Olá, ${primeiro}! Hoje o dia é seu. 🎉\n\n` +
    "Nós, da Blackout Motos, desejamos muita felicidade, saúde e " +
    "paz, e que esse novo ano traga tudo de bom pra você e pra sua " +
    "família.\n\n" +
    "Que venham muitas estradas boas pela frente. Feliz aniversário!"
  );
}
