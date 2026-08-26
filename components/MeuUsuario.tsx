"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserRound, Save, CheckCircle } from "lucide-react";

/*
 * "Meu Usuário": cada um corrige o próprio nome.
 *
 * Esse nome é o que entra como vendedor nas vendas e o que
 * aparece em "Registrado por". Por isso vale usar o nome
 * curto que os relatórios esperam: Cristian, Bruno.
 */

const supabase = createClient();

/*
 * cristian@admin.com -> Cristian
 */
function nomeAPartirDoEmail(email?: string | null) {
  const usuario = String(email || "")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();

  if (!usuario) return "";

  return usuario
    .split(/\s+/)
    .map(
      (parte) =>
        parte.charAt(0).toUpperCase() +
        parte.slice(1).toLowerCase()
    )
    .join(" ");
}

export default function MeuUsuario() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState(false);

  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState("");
  const [nome, setNome] = useState("");
  const [nomeSalvo, setNomeSalvo] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    setErro("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErro("Sessão não encontrada. Entre de novo.");
      setCarregando(false);
      return;
    }

    setId(user.id);
    setEmail(user.email || "");

    /*
     * maybeSingle: usuário criado direto no painel do
     * Supabase pode ainda não ter linha em profiles.
     * Nesse caso a tela cria a linha ao salvar.
     */
    const { data: perfil, error } = await supabase
      .from("profiles")
      .select("nome, papel, email")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setErro(
        `Não foi possível carregar o seu perfil: ${error.message}`
      );
      setCarregando(false);
      return;
    }

    /*
     * Sem nome salvo, sugere a partir do e-mail:
     * cristian@admin.com -> Cristian
     */
    const sugestao =
      perfil?.nome?.trim() ||
      nomeAPartirDoEmail(user.email);

    setNome(sugestao);
    setNomeSalvo(perfil?.nome?.trim() || "");
    setPapel(perfil?.papel || "");

    if (perfil?.email) {
      setEmail(perfil.email);
    }

    setCarregando(false);
  }

  async function salvar() {
    setErro("");
    setSalvo(false);

    if (!nome.trim()) {
      setErro("Informe o seu nome.");
      return;
    }

    setSalvando(true);

    /*
     * upsert cobre os dois casos: perfil que já existe e
     * usuário novo que ainda não tem linha em profiles.
     */
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id,
          nome: nome.trim(),
          email: email || null,
        },
        { onConflict: "id" }
      );

    setSalvando(false);

    if (error) {
      setErro(
        `Não foi possível salvar: ${error.message}`
      );
      return;
    }

    setNomeSalvo(nome.trim());
    setSalvo(true);

    setTimeout(() => setSalvo(false), 3000);
  }

  const inputClass =
    "w-full rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-white outline-none transition focus:border-dourado";

  const labelClass =
    "mb-2 block text-sm font-medium text-texto-suave";

  return (
    <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7">
      <div className="mb-5 flex items-center gap-3 border-b border-grafite-claro pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-dourado/10 text-dourado">
          <UserRound size={20} />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white">
            Meu Usuário
          </h2>

          <p className="text-sm text-texto-suave">
            Este nome entra sozinho como vendedor nas vendas
            e aparece em &quot;Registrado por&quot;.
          </p>
        </div>
      </div>

      {carregando && (
        <p className="text-sm text-texto-suave">
          Carregando seu perfil...
        </p>
      )}

      {!carregando && (
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass}>
              Nome que aparece no sistema
            </label>

            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Cristian"
              className={inputClass}
            />

            <p className="mt-2 text-xs text-texto-suave">
              Use o nome curto, do jeito que deve sair nos
              relatórios por vendedor.
            </p>
          </div>

          <div>
            <label className={labelClass}>E-mail</label>

            <div className="rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-texto-suave">
              {email || "—"}
            </div>

            <p className="mt-2 text-xs text-texto-suave">
              {papel
                ? `Perfil: ${papel}. `
                : ""}
              O e-mail do login não muda por aqui.
            </p>
          </div>

          <div className="md:col-span-2">
            {erro && (
              <div className="mb-4 rounded-xl border border-red-700 bg-red-950/30 p-4 text-sm text-red-300">
                {erro}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={salvar}
                disabled={
                  salvando || nome.trim() === nomeSalvo
                }
                className="inline-flex items-center gap-2 rounded-xl bg-dourado px-6 py-3 font-bold text-preto transition hover:bg-dourado-claro disabled:opacity-50"
              >
                <Save size={17} />
                {salvando
                  ? "Salvando..."
                  : "Salvar Nome"}
              </button>

              {salvo && (
                <span className="inline-flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle size={16} />
                  Nome atualizado.
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
