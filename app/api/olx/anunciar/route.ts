import { createClient } from "@/lib/supabase/server";
import {
  CATEGORIA_MOTO,
  importarAnuncios,
  tokenSalvo,
  versoesDoModelo,
} from "@/lib/olx";
import {
  CEP_DA_LOJA,
  TELEFONE_DA_LOJA,
  acharNaTabela,
  anoParaOlx,
  codigoDaCilindrada,
  codigoDaCor,
  codigoDoCombustivel,
} from "@/lib/olx-anuncio";

/*
 * Publica uma moto na OLX.
 *
 * Uma moto por vez e so no clique: nada em lote, nada
 * agendado. As motos que a loja anunciou na mao continuam
 * intocadas - a OLX nao liga um anuncio do site a um da API, e
 * mandar as duas coisas criaria anuncio repetido.
 *
 * O envio guarda o token do processo. E por ele que da para
 * saber depois se a OLX aceitou, recusou, e por que.
 */

export const dynamic = "force-dynamic";

/* A resposta da OLX vem em "data" e como objeto, nao lista. */
function normalizar(resposta: any): Array<{
  codigo: string;
  nome: string;
}> {
  const conteudo = resposta?.data ?? resposta;

  if (!conteudo || typeof conteudo !== "object") return [];

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

export async function POST(requisicao: Request) {
  const corpo = await requisicao.json().catch(() => null);

  const motorcycleId = String(
    corpo?.motorcycleId || ""
  ).trim();

  const descricao = String(corpo?.descricao || "").trim();

  /* "remover" tira o anuncio do ar; qualquer outra coisa publica. */
  const remover = corpo?.acao === "remover";

  /*
   * "previa" passa por todas as conferencias e monta o anuncio,
   * mas para antes de enviar. E o mesmo caminho do envio de
   * verdade - entao o que a previa mostra e o que vai.
   */
  const previa = corpo?.acao === "previa";

  if (!motorcycleId) {
    return Response.json(
      { error: "Moto não informada." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: moto } = await supabase
    .from("motorcycles")
    .select(
      `
      id, codigo, marca, modelo, versao, ano_fabricacao,
      ano_modelo, cor, quilometragem, cilindrada,
      preco_anunciado, status
    `
    )
    .eq("id", motorcycleId)
    .maybeSingle();

  if (!moto) {
    return Response.json(
      { error: "Moto não encontrada." },
      { status: 404 }
    );
  }

  if (remover) {
    try {
      const token = await tokenSalvo();

      const resposta = await importarAnuncios(token, [
        {
          id: String(moto.codigo || moto.id),
          operation: "delete",
        },
      ]);

      await supabase.from("olx_anuncios").insert({
        motorcycle_id: motorcycleId,
        token_processo:
          resposta?.token ||
          resposta?.data?.token ||
          null,
        situacao: "removido",
        mensagem: resposta?.statusMessage || null,
      });

      return Response.json({ ok: true, removido: true });
    } catch (falha) {
      return Response.json(
        {
          error:
            falha instanceof Error
              ? falha.message
              : "Não foi possível remover.",
        },
        { status: 502 }
      );
    }
  }

  if (moto.status === "vendida") {
    return Response.json(
      { error: "Esta moto está vendida." },
      { status: 400 }
    );
  }

  if (!Number(moto.preco_anunciado)) {
    return Response.json(
      {
        error:
          "Falta o preço anunciado na ficha da moto.",
      },
      { status: 400 }
    );
  }

  /* ---------- fotos ---------- */

  const { data: fotos } = await supabase
    .from("motorcycle_photos")
    .select("url, arquivo_tipo, arquivo_nome")
    .eq("motorcycle_id", motorcycleId)
    .order("ordem", { ascending: true });

  const imagens = (fotos || [])
    .filter(
      (foto: any) =>
        foto.url &&
        !(foto.arquivo_tipo || "").startsWith("video/") &&
        !/\.(mp4|mov|webm)$/i.test(foto.arquivo_nome || "")
    )
    .map((foto: any) => foto.url);

  if (imagens.length === 0) {
    return Response.json(
      {
        error:
          "A moto precisa de pelo menos uma foto para ser anunciada.",
      },
      { status: 400 }
    );
  }

  /* ---------- códigos da OLX ---------- */

  const { data: tabela } = await supabase
    .from("olx_codigos")
    .select("tipo, nosso_nome, codigo, codigo_pai");

  const linhas = tabela || [];

  if (linhas.length === 0) {
    return Response.json(
      {
        error:
          "As tabelas da OLX ainda não foram baixadas. Faça isso em Configurações.",
      },
      { status: 400 }
    );
  }

  const comoTabela = (tipo: string, pai?: string) =>
    linhas
      .filter(
        (linha: any) =>
          linha.tipo === tipo &&
          (!pai || linha.codigo_pai === pai)
      )
      .map((linha: any) => ({
        codigo: linha.codigo,
        nome: linha.nosso_nome,
      }));

  const marca = acharNaTabela(
    moto.marca,
    comoTabela("marca")
  );

  if (!marca) {
    return Response.json(
      {
        error: `A OLX não tem a marca "${moto.marca}". Confira como ela está escrita na ficha.`,
      },
      { status: 400 }
    );
  }

  const modelo = acharNaTabela(
    moto.modelo,
    comoTabela("modelo", marca.codigo)
  );

  if (!modelo) {
    return Response.json(
      {
        error: `A OLX não tem o modelo "${moto.modelo}" para ${moto.marca}. Confira como ele está escrito na ficha.`,
      },
      { status: 400 }
    );
  }

  const cilindrada = codigoDaCilindrada(
    moto.cilindrada,
    comoTabela("cilindrada")
  );

  if (!cilindrada) {
    return Response.json(
      {
        error:
          "Falta a cilindrada na ficha da moto — a OLX exige.",
      },
      { status: 400 }
    );
  }

  const ano = anoParaOlx(
    moto.ano_modelo || moto.ano_fabricacao
  );

  if (!ano) {
    return Response.json(
      { error: "Falta o ano na ficha da moto." },
      { status: 400 }
    );
  }

  try {
    const token = await tokenSalvo();

    /* A versão é obrigatória e depende do modelo. */
    const versoes = normalizar(
      await versoesDoModelo(
        token,
        marca.codigo,
        modelo.codigo
      )
    );

    /*
     * A versao NAO pode cair na primeira da lista.
     *
     * Era o que acontecia: quando a versao da ficha nao batia
     * com nenhuma da OLX, o sistema pegava versoes[0] - e para
     * a Honda CG a primeira e uma 125. A moto do cliente era
     * 160 e foi anunciada como 125, com preco de 160.
     *
     * Anunciar a moto errada e pior que nao anunciar. Entao,
     * se o nome nao bater, tenta pela cilindrada; se nem isso,
     * recusa e diz quais existem.
     */
    const cilindradaDaMoto = String(
      moto.cilindrada || ""
    ).replace(/D/g, "");

    const pelaCilindrada = cilindradaDaMoto
      ? versoes.find((item: any) =>
          String(item.nome).includes(cilindradaDaMoto)
        )
      : null;

    const versao =
      acharNaTabela(moto.versao, versoes) ||
      pelaCilindrada;

    if (!versao) {
      return Response.json(
        {
          error: `A OLX não tem a versão "${
            moto.versao || "(vazia)"
          }" para ${marca.nome} ${modelo.nome}. Versões que ela aceita: ${versoes
            .map((item: any) => item.nome)
            .slice(0, 12)
            .join(", ")}. Ajuste a versão na ficha da moto.`,
        },
        { status: 400 }
      );
    }

    const titulo = [
      moto.marca,
      moto.modelo,
      moto.versao,
      moto.ano_modelo,
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 90);

    const anuncio = {
      /* O nosso código identifica o anúncio na OLX. */
      id: String(moto.codigo || moto.id),
      operation: "insert",
      category: CATEGORIA_MOTO,
      subject: titulo,
      body:
        descricao ||
        `${titulo}. Fale com a Blackout Motos. Veja todo o estoque em blackoutmotos.com.br`,
      phone: TELEFONE_DA_LOJA,
      type: "s",
      price: Number(moto.preco_anunciado),
      zipcode: CEP_DA_LOJA,
      params: {
        vehicle_brand: marca.codigo,
        vehicle_model: modelo.codigo,
        vehicle_version: versao.codigo,
        cubiccms: cilindrada,
        regdate: ano,
        fuel: codigoDoCombustivel("gasolina"),
        mileage: Number(moto.quilometragem) || 0,
        ...(codigoDaCor(moto.cor)
          ? { carcolor: codigoDaCor(moto.cor) }
          : {}),
      },
      images: imagens,
    };

    if (previa) {
      return Response.json({
        previa: true,
        titulo,
        preco: Number(moto.preco_anunciado),
        descricao: anuncio.body,
        fotos: imagens,
        /* Como a OLX vai entender a moto. */
        entendido: {
          marca: marca.nome,
          modelo: modelo.nome,
          versao: versao.nome,
          cilindrada: comoTabela("cilindrada").find(
            (item) => item.codigo === cilindrada
          )?.nome,
          ano,
          km: Number(moto.quilometragem) || 0,
        },
      });
    }

    const resposta = await importarAnuncios(token, [
      anuncio,
    ]);

    const tokenProcesso =
      resposta?.token || resposta?.data?.token || null;

    await supabase.from("olx_anuncios").insert({
      motorcycle_id: motorcycleId,
      token_processo: tokenProcesso,
      situacao: "enviado",
      mensagem: resposta?.statusMessage || null,
    });

    return Response.json({
      ok: true,
      token: tokenProcesso,
      fotos: imagens.length,
      anunciadoComo: `${marca.nome} ${modelo.nome} ${versao.nome}`,
    });
  } catch (falha) {
    const mensagem =
      falha instanceof Error
        ? falha.message
        : "Não foi possível falar com a OLX.";

    await supabase.from("olx_anuncios").insert({
      motorcycle_id: motorcycleId,
      situacao: "erro",
      mensagem,
    });

    return Response.json(
      { error: mensagem },
      { status: 502 }
    );
  }
}
