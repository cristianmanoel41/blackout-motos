"use client";

import { useState } from "react";
import CampoMoeda from "@/components/CampoMoeda";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import EscolherMoto, {
  type MotoDaLista,
} from "@/components/site/EscolherMoto";
import { formatarMoeda } from "@/lib/formatadores/moeda";
import { linkWhatsApp } from "@/lib/dados/loja";

/*
 * O formulário da simulação.
 *
 * Nada do que a pessoa digita é guardado: os campos viram uma
 * mensagem de WhatsApp e ela mesma aperta enviar. Não há banco,
 * nem e-mail, nem registro no servidor - o dado só existe no
 * navegador dela até virar a mensagem.
 *
 * Isso é de propósito. Guardar CPF e data de nascimento de
 * quem só quis simular cria uma responsabilidade que a loja
 * não precisa ter, e a conversa acontece no WhatsApp de todo
 * jeito.
 */

function apenasNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

function mascaraCPF(valor: string) {
  const n = apenasNumeros(valor).slice(0, 11);

  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;

  if (n.length <= 9) {
    return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
  }

  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(
    6,
    9
  )}-${n.slice(9)}`;
}

function mascaraTelefone(valor: string) {
  const n = apenasNumeros(valor).slice(0, 11);

  if (n.length <= 2) return n;

  if (n.length <= 6) {
    return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  }

  /* Celular tem 9 dígitos depois do DDD; fixo tem 8. */
  const corte = n.length > 10 ? 7 : 6;

  return `(${n.slice(0, 2)}) ${n.slice(
    2,
    corte
  )}-${n.slice(corte)}`;
}

function dataPorExtenso(iso: string) {
  if (!iso) return "";

  const [ano, mes, dia] = iso.split("-");

  if (!ano || !mes || !dia) return iso;

  return `${dia}/${mes}/${ano}`;
}

const vazio = {
  nome: "",
  cpf: "",
  nascimento: "",
  telefone: "",
  cnh: "",
  entrada: "",
};

export default function SimuladorFinanciamento({
  moto,
  estoque = [],
}: {
  /* Vem preenchido quando a pessoa clica numa moto. */
  moto?: string;
  /* O que está no pátio hoje, para escolher da lista. */
  estoque?: MotoDaLista[];
}) {
  const [form, setForm] = useState({
    ...vazio,
    moto: moto || "",
  });

  const [erro, setErro] = useState("");

  function mudar(campo: string, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErro("");
  }

  function enviar() {
    if (!form.nome.trim()) {
      setErro("Escreva o seu nome.");
      return;
    }

    if (apenasNumeros(form.cpf).length !== 11) {
      setErro("O CPF precisa ter 11 números.");
      return;
    }

    if (!form.nascimento) {
      setErro("Informe a data de nascimento.");
      return;
    }

    const telefone = apenasNumeros(form.telefone);

    if (telefone.length < 10) {
      setErro("Informe o telefone com DDD.");
      return;
    }

    if (!form.cnh) {
      setErro("Diga se você já tem CNH.");
      return;
    }

    const entrada = Number(form.entrada) || 0;

    const linhas = [
      "Olá! Quero simular um financiamento.",
      "",
      `Nome: ${form.nome.trim()}`,
      `CPF: ${form.cpf}`,
      `Nascimento: ${dataPorExtenso(form.nascimento)}`,
      `Telefone: ${form.telefone}`,
      `CNH: ${form.cnh}`,
      `Entrada: ${
        entrada > 0 ? formatarMoeda(entrada) : "sem entrada"
      }`,
    ];

    if (form.moto.trim()) {
      linhas.push(`Moto: ${form.moto.trim()}`);
    }

    window.open(
      linkWhatsApp(linhas.join("\n")),
      "_blank",
      "noopener,noreferrer"
    );
  }

  const campo =
    "w-full rounded-xl border px-4 py-3 text-sm outline-none";

  const rotulo =
    "mb-1.5 block text-xs font-semibold texto-suave";

  return (
    <div className="cartao-3d rounded-2xl p-5 sm:p-8">
      <h2 className="text-xl font-black texto-claro sm:text-2xl">
        Simule em um minuto
      </h2>

      <p className="mt-2 text-sm leading-6 texto-suave">
        Preencha os campos e aperte o botão: a mensagem chega
        pronta no nosso WhatsApp, com os seus dados já
        escritos. Você confere antes de enviar.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="nome">
            Nome completo
          </label>

          <input
            id="nome"
            value={form.nome}
            onChange={(e) => mudar("nome", e.target.value)}
            placeholder="Como está no documento"
            autoComplete="name"
            className={campo}
          />
        </div>

        <div>
          <label className={rotulo} htmlFor="cpf">
            CPF
          </label>

          <input
            id="cpf"
            value={form.cpf}
            onChange={(e) =>
              mudar("cpf", mascaraCPF(e.target.value))
            }
            placeholder="000.000.000-00"
            inputMode="numeric"
            className={campo}
          />
        </div>

        <div>
          <label className={rotulo} htmlFor="nascimento">
            Data de nascimento
          </label>

          <input
            id="nascimento"
            type="date"
            value={form.nascimento}
            onChange={(e) =>
              mudar("nascimento", e.target.value)
            }
            className={campo}
          />
        </div>

        <div>
          <label className={rotulo} htmlFor="telefone">
            Telefone com DDD
          </label>

          <input
            id="telefone"
            value={form.telefone}
            onChange={(e) =>
              mudar(
                "telefone",
                mascaraTelefone(e.target.value)
              )
            }
            placeholder="(12) 99999-9999"
            inputMode="tel"
            autoComplete="tel"
            className={campo}
          />
        </div>

        <div>
          <label className={rotulo} htmlFor="entrada">
            Valor de entrada
          </label>

          <CampoMoeda
            id="entrada"
            value={form.entrada}
            onChange={(valor) => mudar("entrada", valor)}
            placeholder="0,00"
            className={campo}
          />
        </div>

        <div className="sm:col-span-2">
          <span className={rotulo}>
            Você já tem CNH?
          </span>

          <div className="flex gap-2.5">
            {["Sim", "Não"].map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => mudar("cnh", opcao)}
                aria-pressed={form.cnh === opcao}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  form.cnh === opcao
                    ? "botao-ouro"
                    : "botao-vidro"
                }`}
              >
                {opcao}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <span className={rotulo}>
            Moto de interesse{" "}
            <span className="font-normal">(opcional)</span>
          </span>

          <EscolherMoto
            valor={form.moto}
            aoEscolher={(nome) => mudar("moto", nome)}
            estoque={estoque}
          />
        </div>
      </div>

      {erro && (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {erro}
        </p>
      )}

      <button
        type="button"
        onClick={enviar}
        className="botao-ouro mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-bold"
      >
        <IconeWhatsApp className="h-4 w-4" />
        Mandar mensagem no WhatsApp
      </button>

      <p className="mt-3 text-center text-xs leading-5 texto-suave">
        Seus dados não ficam guardados neste site. Eles só
        viram a mensagem que você envia.
      </p>
    </div>
  );
}
