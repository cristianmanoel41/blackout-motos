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
        <article className="mx-auto max-w-md rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-black">
            Link indisponível
          </h1>

          <p className="mt-2 text-sm text-black/60">
            Este link de estoque não existe mais ou foi
            desativado pela loja. Peça um link novo.
          </p>
        </article>
      </main>
    );
  }

  return (
    <main className="vitrine-clara min-h-screen bg-[#f5f6f8] px-3 py-6 sm:px-4 sm:py-10">
      <div className="mx-auto max-w-6xl">
        {/* CABEÇALHO */}

        <header className="mb-6 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          {/* Faixa dourada da marca. */}
          <div className="h-1.5 bg-gradient-to-r from-[#bd8700] via-[#e0b129] to-[#bd8700]" />

          <div className="flex flex-col items-center px-5 py-7 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-blackout-menu.png"
              alt="Blackout Motos"
              className="h-16 w-auto object-contain sm:h-20"
            />

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a97800]">
              Estoque disponível
            </p>

            <h1 className="mt-1 text-2xl font-bold text-[#0b0b0d] sm:text-3xl">
              {lista.length} moto
              {lista.length === 1 ? "" : "s"} à pronta
              entrega
            </h1>

            <p className="mt-2 text-sm text-black/55">
              São José dos Campos/SP · entrada, troca e
              financiamento
            </p>
          </div>

          {compartilhamento.loja && (
            <p className="border-t border-black/10 bg-black/[.02] px-5 py-2.5 text-center text-xs text-black/50">
              Compartilhado com {compartilhamento.loja}
            </p>
          )}
        </header>

        {lista.length === 0 ? (
          <article className="rounded-2xl border border-black/10 bg-white p-10 text-center text-sm text-black/60">
            Nenhuma moto disponível no momento.
          </article>
        ) : (
          <VitrineLista
            motos={lista}
            capas={capas}
            galerias={galerias}
          />
        )}

        <footer className="mt-8 overflow-hidden rounded-2xl border border-black/10 bg-white p-6 text-center shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-blackout-menu.png"
            alt="Blackout Motos"
            className="mx-auto h-12 w-auto object-contain"
          />

          <p className="mt-4 text-sm font-semibold text-[#0b0b0d]">
            Gostou de alguma? Chama a gente.
          </p>

          <a
            href="https://wa.me/5512996626666"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-sm font-bold text-white transition hover:brightness-95"
          >
            Falar no WhatsApp
          </a>

          <p className="mt-5 text-xs leading-5 text-black/50">
            Avenida Andrômeda, 3521
            <br />
            São José dos Campos/SP · (12) 3917-3777
          </p>
        </footer>
      </div>
    </main>
  );
}
