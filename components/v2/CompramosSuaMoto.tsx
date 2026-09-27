import { ArrowRight } from "lucide-react";
import { linkWhatsApp } from "@/lib/dados/loja";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import AoEntrar from "@/components/v2/AoEntrar";

/*
 * Compramos sua moto.
 *
 * É a seção que traz moto para o pátio, então ela pede uma
 * ação só: chamar no WhatsApp, com a mensagem já escrita. Um
 * formulário aqui daria trabalho ao cliente e ainda pararia
 * numa caixa de entrada que ninguém olha no meio do dia.
 *
 * "Pagamento no PIX" fica no título porque é o que diferencia:
 * a dúvida de quem vende moto é quando o dinheiro cai.
 */

const CONVITE =
  "Olá, gostaria de avaliar minha moto para venda na Blackout Motos.";

export default function CompramosSuaMoto() {
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <AoEntrar>
        <div className="vidro grao relative overflow-hidden px-6 py-12 text-center sm:px-10 lg:py-16">
          <span
            className="brasa h-[28rem] w-[28rem]"
            style={{ top: "-14rem", left: "50%", marginLeft: "-14rem" }}
          />

          <div className="relative">
            <p className="rotulo">Avaliação sem compromisso</p>

            <h2 className="titulo mx-auto mt-4 max-w-2xl text-[clamp(1.9rem,5vw,3rem)] claro">
              Compramos sua moto.{" "}
              <span className="ouro">Pagamento no PIX.</span>
            </h2>

            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 suave sm:text-base">
              Venda com segurança, avaliação justa e dinheiro na
              conta no mesmo dia.
            </p>

            <a
              href={linkWhatsApp(CONVITE)}
              target="_blank"
              rel="noopener noreferrer"
              className="botao-ouro mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm"
            >
              <IconeWhatsApp className="h-4 w-4" />
              Avaliar minha moto
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </AoEntrar>
    </section>
  );
}
