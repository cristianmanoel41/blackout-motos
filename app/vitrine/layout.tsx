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
      `}</style>

      {children}
    </>
  );
}
