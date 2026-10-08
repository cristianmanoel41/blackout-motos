/*
 * A vitrine e a unica tela clara do sistema.
 *
 * O corpo da pagina e escuro para o painel interno, e o preto
 * continuava aparecendo embaixo do conteudo e no efeito
 * elastico de quando se puxa a pagina no celular.
 *
 * Esta regra troca o fundo so enquanto a vitrine esta aberta.
 * "only light" tambem recusa o modo escuro forcado do
 * navegador, que inverteria os cards brancos.
 */

export default function VitrineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        html, body {
          color-scheme: only light;
          background-color: #f5f6f8;
        }

        /*
         * O tema do painel redefine "text-white" como escuro,
         * porque la o fundo e claro. Na vitrine ha texto branco
         * de verdade - sobre foto, sobre o verde do WhatsApp,
         * sobre o preto do contador - e ali branco e branco.
         */
        main .text-white {
          color: #ffffff !important;
        }

        /*
         * Os textos "preto meio apagado" (text-black/50, /60...)
         * o tema do painel troca por cinza claro, pensado para
         * fundo escuro - no branco da vitrine sumiam. Aqui todo
         * texto e preto. Fica de fora so o /20, que e o desenho
         * da moto quando ela ainda nao tem foto.
         */
        main :is(
          [class~='text-black/35'],
          [class~='text-black/40'],
          [class~='text-black/45'],
          [class~='text-black/50'],
          [class~='text-black/55'],
          [class~='text-black/60'],
          [class~='text-black/65'],
          [class~='text-black/70']
        ) {
          color: #0b0b0d !important;
        }
      `}</style>

      {children}
    </>
  );
}
