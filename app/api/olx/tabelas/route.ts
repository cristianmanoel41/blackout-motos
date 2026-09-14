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

/* A OLX devolve listas em formatos diferentes por endpoint. */
function normalizar(resposta: any): any[] {
  if (Array.isArray(resposta)) return resposta;

  for (const campo of ["data", "list", "result"]) {
    if (Array.isArray(resposta?.[campo])) {
      return resposta[campo];
    }
  }

  /* Objeto no formato { "1": "Honda", "2": "Yamaha" }. */
  if (resposta && typeof resposta === "object") {
    return Object.entries(resposta).map(
      ([codigo, nome]) => ({ id: codigo, name: nome })
    );
  }

  return [];
}

function leCodigo(item: any) {
  return String(
    item?.id ?? item?.codigo ?? item?.value ?? ""
  );
}

function leNome(item: any) {
  return String(
    item?.name ?? item?.nome ?? item?.label ?? ""
  );
}

/*
 * Modo de conferencia pelo navegador: abrir a rota com
 * ?conferir=1 mostra a resposta crua da OLX. Serve para
 * descobrir o formato real quando o que chega nao bate com o
 * esperado - melhor do que adivinhar.
 */
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

export async function POST(requisicao: Request) {
  const supabase = await createClient();

  const conferir = new URL(requisicao.url).searchParams.has(
    "conferir"
  );

  try {
    const token = await tokenSalvo();

    if (conferir) {
      const cru = await marcasDeMoto(token);

      return Response.json({
        formato: JSON.stringify(cru).slice(0, 1200),
      });
    }

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

    for (const item of listaMarcas) {
      const codigo = leCodigo(item);
      const nome = leNome(item);

      if (!codigo || !nome) continue;

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

      for (const item of listaModelos) {
        const codigo = leCodigo(item);
        const nome = leNome(item);

        if (!codigo || !nome) continue;

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

    for (const item of listaCilindradas) {
      const codigo = leCodigo(item);
      const nome = leNome(item);

      if (!codigo || !nome) continue;

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
