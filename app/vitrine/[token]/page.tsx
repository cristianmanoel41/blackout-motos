import { createClient } from "@/lib/supabase/server";
import VitrineLista, {
  type MotoVitrine,
} from "@/components/VitrineLista";

/*
 * Vitrine do estoque para outra loja.
 *
 * Página pública: abre sem login, pelo link com o código. Só
 * mostra moto disponível e só as colunas de vitrine - a função
 * no banco não devolve valor de compra, gastos, fornecedor nem
 * dado de cliente, então não há como vazar por aqui.
 */

export const dynamic = "force-dynamic";

export default async function VitrinePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await createClient();

  const { data: info } = await supabase.rpc(
    "vitrine_info",
    { p_token: token }
  );

  const compartilhamento = (info || [])[0];

  const { data: motos, error } = await supabase.rpc(
    "estoque_compartilhado",
    { p_token: token }
  );

  const lista = (motos || []) as MotoVitrine[];

  /*
   * A capa de cada moto. A funcao da vitrine devolve so as
   * colunas de vitrine, entao as fotos vem a parte - a tabela
   * delas libera leitura publica de proposito.
   */
  const capas: Record<string, string> = {};

  /* Todas as fotos, na ordem, para o cliente ver a moto. */
  const galerias: Record<string, string[]> = {};

  if (lista.length > 0) {
    const { data: fotos } = await supabase
      .from("motorcycle_photos")
      .select(
        "motorcycle_id, url, principal, arquivo_tipo, arquivo_nome"
      )
      .in(
        "motorcycle_id",
        lista.map((moto) => moto.id)
      )
      .order("ordem", { ascending: true });

    (fotos || []).forEach((foto: any) => {
      if (!foto.url) return;

      const moto = String(foto.motorcycle_id);

      /* Video nao entra na vitrine: a faixa e de imagem. */
      const ehVideo =
        (foto.arquivo_tipo || "").startsWith("video/") ||
        /.(mp4|mov|webm)$/i.test(
          foto.arquivo_nome || ""
        );

      if (ehVideo) return;

      if (foto.principal) capas[moto] = foto.url;

      galerias[moto] = [
        ...(galerias[moto] || []),
        foto.url,
      ];
    });
  }

  if (!compartilhamento || error) {
    return (
      <main className="min-h-screen bg-[#f5f6f8] px-4 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-black">
            Link indisponível
          </h1>

          <p className="mt-2 text-sm text-black/60">
            Este link de estoque não existe mais ou foi
            desativado pela loja. Peça um link novo.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        {/* CABEÇALHO */}

        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-blackout-menu.png"
            alt="Blackout Motos"
            className="h-[70px] w-[180px] object-contain"
          />

          <h1 className="mt-3 text-xl font-bold text-black">
            Estoque disponível
          </h1>

          <p className="mt-1 text-sm text-black/60">
            {lista.length} moto
            {lista.length === 1 ? "" : "s"} à pronta entrega
            {compartilhamento.loja
              ? ` · compartilhado com ${compartilhamento.loja}`
              : ""}
          </p>
        </div>

        {lista.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white p-10 text-center text-sm text-black/60">
            Nenhuma moto disponível no momento.
          </div>
        ) : (
          <VitrineLista
            motos={lista}
            capas={capas}
            galerias={galerias}
          />
        )}

        <p className="mt-6 text-center text-xs text-black/45">
          Blackout Motos · Avenida Andrômeda, 3521 - São José
          dos Campos/SP · (12) 3917-3777
        </p>
      </div>
    </main>
  );
}
