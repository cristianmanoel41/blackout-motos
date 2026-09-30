"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  aquiConta,
  DESTINO,
  MARCA_DA_MOTO,
} from "@/components/site/medicao";

/*
 * A medição própria do site: as telas abertas.
 *
 * A Vercel já conta quanta gente entrou, mas só conhece
 * endereço: para ela, /estoque/honda-cg-160-2022 é um texto.
 * Aqui cada visita sai com o id da moto, e é isso que deixa o
 * painel dizer "a Twister teve 40 visitas e nenhum WhatsApp" -
 * a frase que faz a loja baixar o preço da moto certa.
 *
 * Não guarda quem: sem cookie, sem id de visitante, sem nada
 * salvo no aparelho. Guarda o que foi visto e de onde veio. É
 * o mesmo tipo de contagem da Vercel, e pelo mesmo motivo não
 * entra no aviso de cookies - que continua valendo só para o
 * pixel do Meta, esse sim seguindo a pessoa fora do site.
 *
 * O clique no WhatsApp NÃO é contado aqui: ele sobe junto com
 * o HTML, num script que corre antes do React - ver
 * `scriptDoWhatsApp` em medicao.ts, que explica por quê. Aqui
 * fica só o que depende do roteador, que é saber quando a
 * pessoa troca de página sem recarregar.
 *
 * Mora na moldura do site, então vale para toda página sem
 * ninguém precisar lembrar de pôr em cada uma.
 */

/*
 * A moto da tela, quando a tela é uma ficha.
 *
 * A ficha marca o próprio `<main>` com `data-moto`, e aqui a
 * medição lê de volta. Um atributo em vez de recado entre
 * componentes porque o navegador monta a tela antes de rodar
 * qualquer efeito: quando esta função é chamada, o atributo já
 * está lá - inclusive na troca de página sem recarregar.
 */
function motoDaTela() {
  return (
    document
      .querySelector(MARCA_DA_MOTO)
      ?.getAttribute("data-moto") || null
  );
}

/*
 * A visita é da aba aberta, não do componente.
 *
 * Por isso estas duas ficam fora dele. Em desenvolvimento o
 * React monta tudo duas vezes de propósito, e guardadas dentro
 * do componente elas voltariam ao começo na segunda montagem -
 * a mesma tela contaria duas vezes, e a segunda ainda diria
 * que é gente nova chegando do Instagram.
 */

/* A primeira tela desta carga de página é a única que sabe de
   onde a pessoa veio: o endereço de origem é gravado quando a
   aba abre e não muda mais enquanto ela anda pelo site. */
let primeiraTela = true;

let ultimaTela: string | null = null;

/*
 * Se esta carga de página é gente chegando, ou a mesma pessoa
 * de novo.
 *
 * Recarregar com F5 e voltar pelo botão do navegador não são
 * visitas novas - mas o navegador continua dizendo que a
 * pessoa veio do Instagram, porque o endereço de origem é
 * guardado na abertura da aba e sobrevive à recarga. Sem esta
 * conferência, quem atualiza a página cinco vezes vira cinco
 * visitas, e a conta que a loja usa para saber quanta gente
 * entrou deixa de valer.
 *
 * `navigate` é chegada de verdade. `reload` e `back_forward`
 * são a mesma visita continuando.
 */
function ehChegada() {
  try {
    const carga = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming | undefined;

    return !carga || carga.type === "navigate";
  } catch {
    /* Navegador que não conta isso: trata como chegada, que é
       o que se supunha antes de existir a conferência. */
    return true;
  }
}

function mandar(dados: Record<string, unknown>) {
  const pacote = JSON.stringify(dados);

  /*
   * sendBeacon é o único envio que o navegador termina depois
   * de a página sair do ar. Ele também devolve `false` quando
   * recusa - fila cheia, ou tipo de conteúdo que aquele
   * navegador não aceita no beacon. Aí o fetch abaixo assume,
   * em vez de a visita sumir em silêncio.
   */
  try {
    if (
      navigator.sendBeacon?.(
        DESTINO,
        new Blob([pacote], { type: "application/json" })
      )
    ) {
      return;
    }
  } catch {
    /* Navegador recusou o beacon: cai no fetch abaixo. */
  }

  fetch(DESTINO, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: pacote,
    keepalive: true,
  }).catch(() => {
    /* Medição não é função do site: se falhar, falha calada. */
  });
}

export default function Medidor() {
  const caminho = usePathname();

  useEffect(() => {
    if (!aquiConta()) return;

    if (ultimaTela === caminho) return;

    ultimaTela = caminho;

    const entrada = primeiraTela && ehChegada();

    primeiraTela = false;

    mandar({
      caminho,
      tipo: "pagina",
      moto: motoDaTela(),
      primeira: entrada,
      referencia: entrada ? document.referrer : "",
      busca: entrada ? window.location.search : "",
    });
  }, [caminho]);

  return null;
}
