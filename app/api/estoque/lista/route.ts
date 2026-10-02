import { promises as fs } from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { createClient } from "@/lib/supabase/server";

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

/* "CG 160 FAN CBS - VERMELHA": a marca fica de fora, porque ela
   já está implícita no modelo e tomaria espaço da coluna. */
function nomeDaMoto(moto: Record<string, unknown>) {
  const nome = [moto.modelo, moto.versao]
    .map((parte) => String(parte || "").trim())
    .filter(Boolean)
    .join(" ");

  const cor = String(moto.cor || "").trim();

  return (
    [nome, cor]
      .filter(Boolean)
      .join(" - ")
      .toUpperCase()
      /*
       * O "i" de injecao continua minusculo: a moto se chama
       * YBR 125i, e "125I" parece erro de digitacao para quem
       * conhece. Vale so quando vem colado no numero.
       */
      .replace(/(\d)I\b/g, "$1i")
  );
}

function numero(valor: unknown) {
  const conta = Number(valor || 0);

  return Number.isFinite(conta) && conta > 0
    ? new Intl.NumberFormat("pt-BR").format(conta)
    : "";
}

function dinheiro(valor: unknown) {
  const conta = Number(valor || 0);

  if (!Number.isFinite(conta) || conta <= 0) return "A consultar";

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(conta);
}

/* "2024/2025", e só um ano quando os dois são iguais ou falta
   um deles - repetir o mesmo número duas vezes não informa. */
function anos(moto: Record<string, unknown>) {
  const fab = String(moto.ano_fabricacao || "").trim();
  const mod = String(moto.ano_modelo || "").trim();

  if (fab && mod) return `${fab}/${mod}`;

  return fab || mod || "";
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("motorcycles")
      .select(
        "marca, modelo, versao, cor, placa, ano_fabricacao, ano_modelo, quilometragem, preco_anunciado"
      )
      .eq("status", "disponivel");

    if (error) {
      console.error("Lista do estoque:", error);

      return new Response("Não deu para ler o estoque.", {
        status: 500,
      });
    }

    /*
     * Por marca, e dentro dela por modelo.
     *
     * A marca é comparada em maiúsculas porque no banco ela
     * aparece escrita de jeitos diferentes - "Honda" e "HONDA"
     * são a mesma marca e não podem virar dois grupos.
     */
    const motos = (data || [])
      .map((moto) => moto as Record<string, unknown>)
      .sort((a, b) => {
        const marcaA = String(a.marca || "").toUpperCase();
        const marcaB = String(b.marca || "").toUpperCase();

        if (marcaA !== marcaB) return marcaA.localeCompare(marcaB);

        return nomeDaMoto(a).localeCompare(nomeDaMoto(b));
      });

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

    documento.render({
      motos: motos.map((moto) => ({
        moto: nomeDaMoto(moto),
        placa: String(moto.placa || "").toUpperCase(),
        anos: anos(moto),
        km: numero(moto.quilometragem),
        valor: dinheiro(moto.preco_anunciado),
      })),
    });

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
