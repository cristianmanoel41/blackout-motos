import type { Metadata } from "next";
import BotaoTeste from "@/components/BotaoTeste";

/*
 * Página de diagnóstico do navegador.
 *
 * Existe porque no celular do Cristian o site não responde a
 * clique nenhum, enquanto no computador funciona. Sem console
 * de desenvolvedor no celular, não há como ler o erro - então
 * a página captura e mostra na própria tela.
 *
 * São três perguntas, na ordem em que as coisas quebram:
 *
 * 1. O navegador executa JavaScript?
 * 2. O React assumiu a página (hidratou)?
 * 3. Algum erro aconteceu? Qual?
 *
 * Não é tela de cliente: fica fora do buscador e sem link.
 */

export const metadata: Metadata = {
  title: "Diagnóstico",
  robots: { index: false, follow: false },
};

const ESCUTA = `
(function () {
  function escrever(id, texto, cor) {
    var alvo = document.getElementById(id);
    if (!alvo) return;
    alvo.textContent = texto;
    alvo.style.color = cor;
  }

  escrever("js", "SIM - o navegador executa JavaScript", "#4ade80");

  var erros = [];

  function registrar(texto) {
    erros.push(texto);
    var caixa = document.getElementById("erros");
    if (caixa) {
      caixa.textContent = erros.join("\\n\\n");
      caixa.style.color = "#fca5a5";
    }
  }

  window.addEventListener("error", function (evento) {
    registrar(
      (evento.message || "erro") +
        "\\n" +
        (evento.filename || "") +
        ":" +
        (evento.lineno || "")
    );
  });

  window.addEventListener("unhandledrejection", function (evento) {
    registrar("Promessa recusada: " + (evento.reason && evento.reason.message ? evento.reason.message : evento.reason));
  });

  escrever("navegador", navigator.userAgent, "#e5e7eb");
})();
`;

export default function DiagnosticoPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0c",
        color: "#f2f3f5",
        padding: "24px 16px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ margin: "0 auto", maxWidth: 640 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>
          Diagnóstico do navegador
        </h1>

        <p
          style={{
            marginTop: 8,
            fontSize: 14,
            color: "#9ca3af",
          }}
        >
          Tire um print desta tela inteira e mande para o
          Claude.
        </p>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 13, color: "#9ca3af" }}>
            1. JavaScript roda?
          </h2>
          <p
            id="js"
            style={{
              marginTop: 4,
              fontSize: 15,
              fontWeight: 700,
              color: "#fca5a5",
            }}
          >
            NÃO - o navegador não executou nada
          </p>
        </section>

        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 13, color: "#9ca3af" }}>
            2. O React assumiu a página?
          </h2>

          <BotaoTeste />
        </section>

        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 13, color: "#9ca3af" }}>
            3. Erros capturados
          </h2>
          <pre
            id="erros"
            style={{
              marginTop: 6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 12,
              lineHeight: 1.5,
              color: "#6b7280",
            }}
          >
            nenhum até agora
          </pre>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 13, color: "#9ca3af" }}>
            Navegador
          </h2>
          <p
            id="navegador"
            style={{
              marginTop: 4,
              fontSize: 11,
              lineHeight: 1.5,
              wordBreak: "break-word",
              color: "#6b7280",
            }}
          >
            (não detectado)
          </p>
        </section>
      </div>

      <script
        dangerouslySetInnerHTML={{ __html: ESCUTA }}
      />
    </main>
  );
}
