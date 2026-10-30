import { promises as fs } from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { createClient } from "@/lib/supabase/server";
import {
  agruparPorCilindrada,
  anosDaMoto,
  nomeDaMoto,
  quilometros,
  valorDaLista,
} from "@/lib/dados/lista-estoque";

/*
 * A lista do estoque disponível, em Word.
 *
 * É a lista que a loja manda para cliente e para parceiro.
 * Antes era mantida à mão num documento, moto a moto - e toda
 * venda ou entrada deixava o arquivo desatualizado sem ninguém
 * perceber. Agora sai do estoque, sempre certa.
 *
 * O modelo é o próprio documento que a loja já usava
 * (public/templates/estoque-lista.docx): mesmo título, mesmo
 * cabeçalho azul, mesma grade. Só as linhas de moto é que se
 * repetem. Quem receber não vê diferença do que já recebia.
 *
 * Fica atrás do login - a lista traz placa, que não é dado de
 * vitrine.
 */

export const runtime = "nodejs";

/* A grafia e a ordem das motos ficam em lib/dados/lista-estoque,
   junto da lista que abre na tela do estoque. */

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("motorcycles")
      .select(
        /* `cilindrada` é o que separa a lista em grupos - sem
           ela no select, toda moto cai em "outras". */
        "marca, modelo, versao, cor, placa, ano_fabricacao, ano_modelo, quilometragem, cilindrada, preco_anunciado"
      )
      .eq("status", "disponivel");

    if (error) {
      console.error("Lista do estoque:", error);

      return new Response("Não deu para ler o estoque.", {
        status: 500,
      });
    }

    const motos = (data || []).map(
      (moto) => moto as Record<string, unknown>
    );

    const grupos = agruparPorCilindrada(motos);

    const modelo = await fs.readFile(
      path.join(
        process.cwd(),
        "public",
        "templates",
        "estoque-lista.docx"
      )
    );

    const documento = new Docxtemplater(new PizZip(modelo), {
      paragraphLoop: true,
      linebreaks: true,
    });

    /*
     * Cada cilindrada entra com uma linha de titulo na frente.
     *
     * A linha de grupo é uma linha normal da tabela, com texto
     * só na primeira coluna - a prévia reconhece ela por isso
     * e pinta diferente. Fazer com que a tabela do Word tenha
     * dois tipos de linha daria um modelo bem mais complicado
     * para um ganho que o olho nem percebe.
     */
    const linhas: Record<string, string>[] = [];

    const vazia = {
      moto: "",
      placa: "",
      anos: "",
      km: "",
      valor: "",
    };

    /*
     * Linhas em branco ate a tabela encher a folha.
     *
     * A loja imprime a lista e anota a caneta o que chegou
     * depois - moto nova, preco acertado na hora. Tabela que
     * acaba no meio da pagina deixa o resto da folha inutil, e
     * o papel com cara de rascunho.
     *
     * LINHAS_NA_FOLHA foi medido no Chrome, na propria previa:
     * com 28 a folha fecha em 297mm exatos; com 29 ela estoura
     * e a tabela vai para a segunda pagina.
     */
    const LINHAS_NA_FOLHA = 28;

    /*
     * Quantas linhas livres sobram para cada cilindrada.
     *
     * Moto que chega é anotada à caneta no grupo dela - uma
     * 125 nova vai escrita junto das outras 125, não no fim da
     * folha. Para isso cada grupo precisa de espaço próprio.
     *
     * O que sobra da folha é dividido entre os grupos, mas
     * nunca menos de uma linha por grupo: grupo sem espaço
     * nenhum derruba a razão de ter separado a lista. Quando o
     * estoque crescer a ponto de nem isso caber, a tabela
     * passa para a segunda página - mais moto, mais papel.
     */
    const LIVRES_POR_GRUPO = Math.max(
      1,
      Math.floor(
        (LINHAS_NA_FOLHA - grupos.length - motos.length) /
          Math.max(grupos.length, 1)
      )
    );

    for (const grupo of grupos) {
      linhas.push({
        moto: grupo.rotulo,
        placa: "",
        anos: "",
        km: "",
        valor: "",
      });

      for (const moto of grupo.motos) {
        linhas.push({
          moto: nomeDaMoto(moto),
          placa: String(moto.placa || "").toUpperCase(),
          anos: anosDaMoto(moto),
          km: quilometros(moto.quilometragem),
          valor: valorDaLista(moto.preco_anunciado),
        });
      }

      /* O espaço da cilindrada, logo abaixo das motos dela. */
      for (let i = 0; i < LIVRES_POR_GRUPO; i += 1) {
        linhas.push({ ...vazia });
      }
    }


    while (linhas.length < LINHAS_NA_FOLHA) {
      linhas.push({
        moto: "",
        placa: "",
        anos: "",
        km: "",
        valor: "",
      });
    }

    /*
     * A linha embaixo do título.
     *
     * Lista impressa anda pela loja e volta dias depois - sem
     * a data, ninguém sabe se o preço ali ainda vale. A
     * contagem vem junto porque é o primeiro número que
     * alguém procura.
     */
    const quando = new Date().toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    const subtitulo = `${motos.length} ${
      motos.length === 1
        ? "moto disponível"
        : "motos disponíveis"
    }  ·  ${quando}`;

    documento.render({ motos: linhas, subtitulo });

    const arquivo = documento
      .getZip()
      .generate({ type: "nodebuffer", compression: "DEFLATE" });

    /* O nome leva a data: quem recebe sabe de quando é a lista,
       e dois arquivos na pasta não se sobrescrevem. */
    const hoje = new Date()
      .toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })
      .replace(/\//g, "-");

    return new Response(new Uint8Array(arquivo), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="estoque-${hoje}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (erro) {
    console.error("Lista do estoque:", erro);

    return new Response("Não deu para montar a lista.", {
      status: 500,
    });
  }
}
