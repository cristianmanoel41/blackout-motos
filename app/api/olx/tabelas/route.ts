import { createClient } from "@/lib/supabase/server";
import {
  cilindradas,
  marcasDeMoto,
  modelosDaMarca,
  tokenSalvo,
} from "@/lib/olx";

/*
 * Baixa as tabelas de codigo da OLX e tenta casar com o que a
 * loja cadastrou.
 *
 * A OLX nao aceita "Honda" nem "CB 300F": quer codigo dela.
 * Aqui a ponte e montada uma vez e fica guardada, para o
 * anuncio sair sem ninguem procurar codigo na mao.
 *
 * So baixa os modelos das marcas que existem no estoque - a
 * tabela inteira sao milhares de linhas que nao serviriam para
 * nada.
 */

export const dynamic = "force-dynamic";

/* Tira acento, pontuacao e espaco: "CB 300F" vira "cb300f". */
function chave(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

/*
 * A OLX embrulha tudo em "data" e devolve objeto, nao lista -
 * e os dois lados trocam de lugar conforme a tabela:
 *
 *   marcas:      { "Honda": 15, "Yamaha": 7 }   nome -> codigo
 *   cilindradas: { "3": "250", "9": "300" }     codigo -> nome
 *
 * Quem decide e a chave: se todas forem numero, a chave e o
 * codigo; senao, a chave e o nome.
 */
function normalizar(resposta: any): Array<{
  codigo: string;
  nome: string;
}> {
  const conteudo = resposta?.data ?? resposta;

  if (!conteudo || typeof conteudo !== "object") return [];

  if (Array.isArray(conteudo)) {
    return conteudo
      .map((item: any) => ({
        codigo: String(
          item?.id ?? item?.codigo ?? item?.value ?? ""
        ),
        nome: String(
          item?.name ?? item?.nome ?? item?.label ?? ""
        ),
      }))
      .filter((item) => item.codigo && item.nome);
  }

  const entradas = Object.entries(conteudo);

  const chavesSaoNumeros = entradas.every(([chave]) =>
    /^\d+$/.test(chave)
  );

  return entradas
    .map(([chave, valor]) =>
      chavesSaoNumeros
        ? { codigo: chave, nome: String(valor) }
        : { codigo: String(valor), nome: chave }
    )
    .filter((item) => item.codigo && item.nome);
}

export async function GET(requisicao: Request) {
  if (
    !new URL(requisicao.url).searchParams.has("conferir")
  ) {
    return Response.json(
      { error: "Use POST para baixar as tabelas." },
      { status: 405 }
    );
  }

  try {
    const token = await tokenSalvo();

    const marcas = await marcasDeMoto(token);
    const cc = await cilindradas(token);

    return Response.json({
      marcas: JSON.stringify(marcas).slice(0, 1500),
      cilindradas: JSON.stringify(cc).slice(0, 600),
    });
  } catch (falha) {
    return Response.json(
      {
        error:
          falha instanceof Error
            ? falha.message
            : "erro",
      },
      { status: 502 }
    );
  }
}

export async function POST() {
  const supabase = await createClient();

  try {
    const token = await tokenSalvo();

    /* Marcas que a loja realmente tem. */
    const { data: motos } = await supabase
      .from("motorcycles")
      .select("marca, modelo")
      .not("marca", "is", null);

    const marcasDaLoja = new Set(
      (motos || []).map((moto) => chave(moto.marca))
    );

    const linhas: any[] = [];

    /* ---------- marcas ---------- */

    const listaMarcas = normalizar(
      await marcasDeMoto(token)
    );

    const casadas: Array<{ codigo: string; nome: string }> =
      [];

    for (const { codigo, nome } of listaMarcas) {
      linhas.push({
        tipo: "marca",
        nosso_nome: chave(nome),
        codigo,
      });

      if (marcasDaLoja.has(chave(nome))) {
        casadas.push({ codigo, nome });
      }
    }

    /* ---------- modelos, só das marcas que temos ---------- */

    for (const marca of casadas) {
      const listaModelos = normalizar(
        await modelosDaMarca(token, marca.codigo)
      );

      for (const { codigo, nome } of listaModelos) {
        linhas.push({
          tipo: "modelo",
          nosso_nome: chave(nome),
          codigo,
          codigo_pai: marca.codigo,
        });
      }
    }

    /* ---------- cilindradas ---------- */

    const listaCilindradas = normalizar(
      await cilindradas(token)
    );

    for (const { codigo, nome } of listaCilindradas) {
      linhas.push({
        tipo: "cilindrada",
        nosso_nome: chave(nome),
        codigo,
      });
    }

    if (linhas.length === 0) {
      return Response.json(
        {
          error:
            "A OLX não devolveu nenhuma tabela. Verifique se o escopo autoupload está liberado.",
        },
        { status: 502 }
      );
    }

    /* Regrava do zero: a tabela deles mudou, a nossa acompanha. */
    await supabase
      .from("olx_codigos")
      .delete()
      .in("tipo", ["marca", "modelo", "cilindrada"]);

    const { error } = await supabase
      .from("olx_codigos")
      .insert(linhas);

    if (error) throw error;

    return Response.json({
      ok: true,
      marcas: linhas.filter((l) => l.tipo === "marca")
        .length,
      modelos: linhas.filter((l) => l.tipo === "modelo")
        .length,
      cilindradas: linhas.filter(
        (l) => l.tipo === "cilindrada"
      ).length,
      marcasDaLoja: casadas.map((m) => m.nome),
    });
  } catch (falha) {
    return Response.json(
      {
        error:
          falha instanceof Error
            ? falha.message
            : "Não foi possível baixar as tabelas.",
      },
      { status: 502 }
    );
  }
}
