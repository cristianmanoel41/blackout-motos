"use client";

import { useEffect, useState } from "react";
import {
  Store,
  Phone,
  MapPin,
  DollarSign,
  Landmark,
  Save,
  CheckCircle,
} from "lucide-react";

type Configuracoes = {
  nomeLoja: string;
  telefone: string;
  endereco: string;
  cidade: string;
  valorTransferencia: string;
  bancoPadrao: string;
};

const configuracaoInicial: Configuracoes = {
  nomeLoja: "BLACKOUT MOTOS",
  telefone: "",
  endereco: "",
  cidade: "São José dos Campos - SP",
  valorTransferencia: "690",
  bancoPadrao: "",
};

export default function ConfiguracoesPage() {
  const [config, setConfig] =
    useState<Configuracoes>(configuracaoInicial);

  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    const dadosSalvos = localStorage.getItem(
      "blackout-motos-configuracoes"
    );

    if (dadosSalvos) {
      try {
        setConfig(JSON.parse(dadosSalvos));
      } catch {
        setConfig(configuracaoInicial);
      }
    }
  }, []);

  function atualizarCampo(
    campo: keyof Configuracoes,
    valor: string
  ) {
    setConfig((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));

    setSalvo(false);
  }

  function salvarConfiguracoes() {
    localStorage.setItem(
      "blackout-motos-configuracoes",
      JSON.stringify(config)
    );

    setSalvo(true);

    setTimeout(() => {
      setSalvo(false);
    }, 3000);
  }

  return (
    <main className="min-h-screen bg-preto text-texto">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        {/* CABEÇALHO */}

        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-dourado">
            BLACKOUT MOTOS
          </p>

          <h1 className="text-3xl font-bold text-white">
            Configurações
          </h1>

          <p className="mt-2 text-sm text-texto-suave">
            Configure os dados principais utilizados no sistema.
          </p>
        </div>

        {/* MENSAGEM DE SUCESSO */}

        {salvo && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-700 bg-green-950/40 p-4 text-green-300">
            <CheckCircle size={20} />

            <span>
              Configurações salvas com sucesso.
            </span>
          </div>
        )}

        <div className="space-y-6">
          {/* DADOS DA LOJA */}

          <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-dourado/10 text-dourado">
                <Store size={22} />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white">
                  Dados da Loja
                </h2>

                <p className="text-sm text-texto-suave">
                  Informações principais da empresa.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* NOME */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Nome da loja
                </label>

                <div className="relative">
                  <Store
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-texto-suave"
                  />

                  <input
                    type="text"
                    value={config.nomeLoja}
                    onChange={(e) =>
                      atualizarCampo(
                        "nomeLoja",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-grafite-claro bg-preto py-3 pl-11 pr-4 text-white outline-none transition focus:border-dourado"
                    placeholder="Nome da loja"
                  />
                </div>
              </div>

              {/* TELEFONE */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Telefone / WhatsApp
                </label>

                <div className="relative">
                  <Phone
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-texto-suave"
                  />

                  <input
                    type="text"
                    value={config.telefone}
                    onChange={(e) =>
                      atualizarCampo(
                        "telefone",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-grafite-claro bg-preto py-3 pl-11 pr-4 text-white outline-none transition focus:border-dourado"
                    placeholder="(12) 99999-9999"
                  />
                </div>
              </div>

              {/* ENDEREÇO */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Endereço
                </label>

                <div className="relative">
                  <MapPin
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-texto-suave"
                  />

                  <input
                    type="text"
                    value={config.endereco}
                    onChange={(e) =>
                      atualizarCampo(
                        "endereco",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-grafite-claro bg-preto py-3 pl-11 pr-4 text-white outline-none transition focus:border-dourado"
                    placeholder="Avenida, número, bairro"
                  />
                </div>
              </div>

              {/* CIDADE */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Cidade
                </label>

                <div className="relative">
                  <MapPin
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-texto-suave"
                  />

                  <input
                    type="text"
                    value={config.cidade}
                    onChange={(e) =>
                      atualizarCampo(
                        "cidade",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-grafite-claro bg-preto py-3 pl-11 pr-4 text-white outline-none transition focus:border-dourado"
                    placeholder="Cidade - UF"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* VENDAS */}

          <section className="rounded-2xl border border-grafite-claro bg-grafite p-5 md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-dourado/10 text-dourado">
                <DollarSign size={22} />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white">
                  Configurações de Vendas
                </h2>

                <p className="text-sm text-texto-suave">
                  Valores e opções utilizadas nas vendas.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* TRANSFERÊNCIA */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Valor padrão da transferência
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-dourado">
                    R$
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.valorTransferencia}
                    onChange={(e) =>
                      atualizarCampo(
                        "valorTransferencia",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-grafite-claro bg-preto py-3 pl-12 pr-4 text-white outline-none transition focus:border-dourado"
                    placeholder="690,00"
                  />
                </div>

                <p className="mt-2 text-xs text-texto-suave">
                  Valor utilizado como referência nas vendas.
                </p>
              </div>

              {/* BANCO */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Banco / Financeira padrão
                </label>

                <div className="relative">
                  <Landmark
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-texto-suave"
                  />

                  <input
                    type="text"
                    value={config.bancoPadrao}
                    onChange={(e) =>
                      atualizarCampo(
                        "bancoPadrao",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-grafite-claro bg-preto py-3 pl-11 pr-4 text-white outline-none transition focus:border-dourado"
                    placeholder="Ex.: Santander"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* INFORMAÇÃO */}

          <section className="rounded-2xl border border-dourado/30 bg-dourado/5 p-5">
            <h3 className="font-semibold text-dourado">
              Sobre estas configurações
            </h3>

            <p className="mt-2 text-sm leading-6 text-texto-suave">
              Nesta primeira versão, as configurações ficam
              salvas neste navegador. Depois podemos integrar
              esta página ao Supabase para que as mesmas
              configurações sejam usadas em qualquer
              computador ou celular.
            </p>
          </section>

          {/* SALVAR */}

          <button
            type="button"
            onClick={salvarConfiguracoes}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-dourado px-6 py-4 font-bold text-preto transition hover:bg-dourado-claro"
          >
            <Save size={20} />
            Salvar Configurações
          </button>
        </div>
      </div>
    </main>
  );
}