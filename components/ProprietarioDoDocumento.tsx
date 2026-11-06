"use client";

import { useEffect, useRef, useState } from "react";
import { UserRound } from "lucide-react";
import {
  type CampoDoProprietario,
  type DadosDoProprietario,
} from "@/lib/dados/proprietario";

/*
 * "A MOTO ESTÁ NO NOME DE OUTRA PESSOA"
 *
 * Fica logo abaixo de quem vendeu, no cadastro e na ficha.
 * Marcado, pede os dados de quem está no CRLV - é essa pessoa
 * que assina a procuração. O contrato de compra continua com
 * quem vendeu e passa a citar o proprietário.
 *
 * O CEP preenche rua, bairro, cidade e estado, como no
 * vendedor.
 */

const ESTILO_CAMPO =
  "w-full rounded-xl border border-grafite-claro bg-preto px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-dourado";

const CAMPOS: Array<{
  campo: CampoDoProprietario;
  rotulo: string;
  dica: string;
  largo?: boolean;
}> = [
  { campo: "proprietario_nome", rotulo: "Nome completo do proprietário *", dica: "Como está no CRLV", largo: true },
  { campo: "proprietario_cpf", rotulo: "CPF *", dica: "000.000.000-00" },
  { campo: "proprietario_rg", rotulo: "RG", dica: "RG" },
  { campo: "proprietario_cep", rotulo: "CEP *", dica: "00000-000" },
  { campo: "proprietario_rua", rotulo: "Rua *", dica: "Nome da rua" },
  { campo: "proprietario_numero", rotulo: "Número *", dica: "Número" },
  { campo: "proprietario_complemento", rotulo: "Complemento", dica: "Apto, bloco, fundos, casa..." },
  { campo: "proprietario_bairro", rotulo: "Bairro *", dica: "Bairro" },
  { campo: "proprietario_cidade", rotulo: "Cidade *", dica: "Cidade" },
  { campo: "proprietario_estado", rotulo: "Estado *", dica: "SP" },
];

function formatarCep(valor: string) {
  const numeros = valor.replace(/\D/g, "").slice(0, 8);

  return numeros.length > 5
    ? `${numeros.slice(0, 5)}-${numeros.slice(5)}`
    : numeros;
}

export default function ProprietarioDoDocumento({
  ligado,
  aoLigar,
  dados,
  aoMudar,
  editando = true,
}: {
  ligado: boolean;
  aoLigar: (ligado: boolean) => void;
  dados: DadosDoProprietario;
  aoMudar: (parcial: Partial<DadosDoProprietario>) => void;
  editando?: boolean;
}) {
  const [recadoCep, setRecadoCep] = useState("");

  const cep = dados.proprietario_cep.replace(/\D/g, "");

  /* O CEP que já veio salvo não é buscado de novo: a busca
     trocaria o endereço que alguém já conferiu. */
  const cepJaBuscado = useRef(cep);

  /* Mesma busca do CEP do vendedor (viacep). */
  useEffect(() => {
    if (!editando || !ligado || cep.length !== 8) return;
    if (cep === cepJaBuscado.current) return;

    const controlador = new AbortController();

    const timer = window.setTimeout(async () => {
      setRecadoCep("Buscando...");

      try {
        const resposta = await fetch(
          `https://viacep.com.br/ws/${cep}/json/`,
          { signal: controlador.signal }
        );
        const endereco = await resposta.json();

        if (!resposta.ok || endereco?.erro) {
          setRecadoCep("CEP não encontrado. Preencha o endereço à mão.");
          return;
        }

        cepJaBuscado.current = cep;

        aoMudar({
          proprietario_rua: endereco.logradouro || "",
          proprietario_bairro: endereco.bairro || "",
          proprietario_cidade: endereco.localidade || "",
          proprietario_estado: endereco.uf || "",
        });
        setRecadoCep("Encontrado");
      } catch {
        if (!controlador.signal.aborted) {
          setRecadoCep("Não foi possível buscar o CEP agora.");
        }
      }
    }, 400);

    return () => {
      controlador.abort();
      window.clearTimeout(timer);
    };
    // aoMudar muda a cada render da tela; a busca só depende do CEP.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cep, ligado, editando]);

  /* Só leitura (ficha fora da edição). */
  if (!editando) {
    if (!ligado) {
      return (
        <p className="text-sm text-texto-suave">
          A moto está no nome de quem vendeu.
        </p>
      );
    }

    const endereco = [
      [dados.proprietario_rua, dados.proprietario_numero]
        .filter(Boolean)
        .join(", "),
      dados.proprietario_complemento,
      dados.proprietario_bairro,
      [dados.proprietario_cidade, dados.proprietario_estado]
        .filter(Boolean)
        .join("/"),
      dados.proprietario_cep,
    ]
      .filter(Boolean)
      .join(" - ");

    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Leitura rotulo="Proprietário no documento" valor={dados.proprietario_nome} />
        <Leitura rotulo="CPF" valor={dados.proprietario_cpf} />
        <Leitura rotulo="RG" valor={dados.proprietario_rg} />
        <div className="md:col-span-3">
          <Leitura rotulo="Endereço" valor={endereco} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <label
        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
          ligado
            ? "border-dourado bg-dourado/10"
            : "border-grafite-claro hover:border-dourado/60"
        }`}
      >
        <input
          type="checkbox"
          checked={ligado}
          onChange={(evento) => aoLigar(evento.target.checked)}
          className="mt-0.5 h-4 w-4 accent-yellow-500"
        />

        <span>
          <span className="flex items-center gap-2 font-semibold text-white">
            <UserRound size={16} className="text-dourado" />
            A moto está no nome de outra pessoa
          </span>

          <span className="mt-1 block text-xs leading-5 text-texto-suave">
            Ex.: o genro vende a moto que está no nome da sogra. A
            procuração sai no nome de quem está no CRLV, e o
            contrato de compra continua com quem vendeu, citando o
            proprietário.
          </span>
        </span>
      </label>

      {ligado && (
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {CAMPOS.map(({ campo, rotulo, dica, largo }) => (
            <div key={campo} className={largo ? "md:col-span-2" : ""}>
              <label className="mb-2 block text-sm font-medium text-texto-suave">
                {rotulo}
              </label>

              <input
                value={dados[campo]}
                inputMode={campo === "proprietario_cep" ? "numeric" : undefined}
                maxLength={campo === "proprietario_cep" ? 9 : undefined}
                onChange={(evento) => {
                  const valor =
                    campo === "proprietario_cep"
                      ? formatarCep(evento.target.value)
                      : evento.target.value;

                  if (campo === "proprietario_cep") setRecadoCep("");

                  aoMudar({ [campo]: valor });
                }}
                placeholder={dica}
                className={ESTILO_CAMPO}
              />

              {campo === "proprietario_cep" && recadoCep && (
                <p
                  className={`mt-2 text-xs ${
                    recadoCep === "Encontrado"
                      ? "text-green-400"
                      : recadoCep === "Buscando..."
                        ? "text-dourado"
                        : "text-red-400"
                  }`}
                >
                  {recadoCep}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Leitura({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="mb-2 text-xs text-texto-suave">{rotulo}</p>
      <p className="font-medium text-texto">{valor || "—"}</p>
    </div>
  );
}
