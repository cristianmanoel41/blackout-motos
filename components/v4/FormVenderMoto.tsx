"use client";

import { useState, type ReactNode } from "react";
import { Camera, CheckCircle2, Video } from "lucide-react";
import CampoMoeda from "@/components/CampoMoeda";
import { IconeWhatsApp } from "@/components/site/IconeWhatsApp";
import { linkWhatsApp } from "@/lib/dados/loja";
import { formatarMoeda } from "@/lib/formatadores/moeda";

/*
 * O FORMULÁRIO "COMPRAMOS SUA MOTO"
 *
 * A pessoa preenche os dados da moto, a situação e o contato, e
 * o envio abre o WhatsApp da loja com tudo escrito, em blocos -
 * a loja recebe a ficha pronta, sem "qual moto?", "que ano?" de
 * volta. Fotos e vídeos vão na própria conversa, logo em seguida
 * (o WhatsApp não aceita anexo por link).
 *
 * Desde 11/11/2026 a ficha também fica guardada no sistema
 * (tela "Motos oferecidas", /motos-oferecidas), para a loja não
 * perder quem preencheu e não mandou a mensagem. O botão final é um link de verdade para
 * o wa.me, para a contagem de cliques no WhatsApp do site pegar
 * também este envio.
 *
 * Desenho: campos de linha só embaixo, rótulo pequeno espaçado,
 * asterisco dourado no obrigatório - como a referência que a loja
 * mandou.
 */

type SimNao = "" | "sim" | "nao";

const ANO_ATUAL = new Date().getFullYear();

const MARCAS = [
  "Honda",
  "Yamaha",
  "Suzuki",
  "Kawasaki",
  "BMW",
  "Triumph",
  "Royal Enfield",
  "Harley-Davidson",
  "Dafra",
  "Shineray",
  "Haojue",
  "KTM",
];

const FOTOS = [
  { Icone: Camera, texto: "Frente, traseira e as duas laterais" },
  { Icone: Camera, texto: "Painel ligado, mostrando a km" },
  { Icone: Camera, texto: "Documento (CRLV) e detalhes ou avarias" },
  { Icone: Video, texto: "Um vídeo dando a volta na moto" },
  { Icone: Video, texto: "Um vídeo com o motor ligado" },
];

const so = (texto: string, maximo: number) => texto.replace(/\D/g, "").slice(0, maximo);

function telefoneEscrito(digitos: string) {
  const d = digitos.slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}

const simNao = (v: SimNao) => (v === "sim" ? "Sim" : v === "nao" ? "Não" : "não informado");

/* ---------- peças do desenho ---------- */

function Rotulo({ para, children, obrigatorio }: { para?: string; children: ReactNode; obrigatorio?: boolean }) {
  return (
    <label
      htmlFor={para}
      className="block font-mono text-[11px] uppercase tracking-[0.22em] suave"
    >
      {children}
      {obrigatorio && <span className="ml-1.5 ouro">*</span>}
    </label>
  );
}

const CAMPO =
  "campo-linha mt-2 w-full pb-3 pt-1 text-[16px] outline-none transition";

function Campo({
  id,
  rotulo,
  obrigatorio,
  dica,
  erro,
  children,
}: {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
  dica?: string;
  erro?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Rotulo para={id} obrigatorio={obrigatorio}>
        {rotulo}
      </Rotulo>
      {children}
      {erro ? (
        <p data-erro className="mt-2 text-[13px] text-[#f87171]">{erro}</p>
      ) : dica ? (
        <p className="mt-2 text-[13px] suave">{dica}</p>
      ) : null}
    </div>
  );
}

function Escolha<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
  obrigatorio,
  erro,
}: {
  rotulo: string;
  valor: T;
  opcoes: { valor: T; nome: string }[];
  aoMudar: (v: T) => void;
  obrigatorio?: boolean;
  erro?: string;
}) {
  return (
    <div>
      <Rotulo obrigatorio={obrigatorio}>{rotulo}</Rotulo>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={rotulo}>
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={valor === o.valor}
            onClick={() => aoMudar(o.valor)}
            className={`rounded-full border px-4 py-2 text-[14px] font-medium transition ${
              valor === o.valor
                ? "border-[#e0b129] bg-[#e0b129] text-black"
                : "border-white/15 text-white/75 hover:border-[#e0b129]/60"
            }`}
          >
            {o.nome}
          </button>
        ))}
      </div>
      {erro && <p data-erro className="mt-2 text-[13px] text-[#f87171]">{erro}</p>}
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-t border-white/[.08] pt-8 first:border-t-0 first:pt-0">
      <h2 className="text-[1.35rem] font-semibold tracking-tight text-white sm:text-[1.5rem]">{titulo}</h2>
      <div className="mt-7 grid gap-x-10 gap-y-8 sm:grid-cols-2">{children}</div>
    </section>
  );
}

const SIM_NAO: { valor: SimNao; nome: string }[] = [
  { valor: "sim", nome: "Sim" },
  { valor: "nao", nome: "Não" },
];

/* ---------- o formulário ---------- */

export default function FormVenderMoto() {
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [versao, setVersao] = useState("");
  const [anoFab, setAnoFab] = useState("");
  const [anoMod, setAnoMod] = useState("");
  const [km, setKm] = useState("");
  const [cor, setCor] = useState("");

  const [intencao, setIntencao] = useState<"" | "vender" | "trocar">("");
  const [quitada, setQuitada] = useState<"" | "quitada" | "financiada">("");
  const [falta, setFalta] = useState("");
  const [docEmDia, setDocEmDia] = useState<SimNao>("");
  const [unicoDono, setUnicoDono] = useState<SimNao>("");
  const [manual, setManual] = useState<SimNao>("");
  const [chaveReserva, setChaveReserva] = useState<SimNao>("");
  const [sinistro, setSinistro] = useState<SimNao>("");
  const [espera, setEspera] = useState("");
  const [obs, setObs] = useState("");

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");

  const [tentou, setTentou] = useState(false);
  const [enviado, setEnviado] = useState(false);
  /* Campo escondido: gente não vê, robô preenche (ver a rota). */
  const [armadilha, setArmadilha] = useState("");

  /* ---------- o que falta ---------- */

  const ano = (v: string) => {
    const n = Number(v);
    return v.length === 4 && n >= 1970 && n <= ANO_ATUAL + 1;
  };

  const erros: Record<string, string> = {};
  if (!marca.trim()) erros.marca = "Diga a marca.";
  if (!modelo.trim()) erros.modelo = "Diga o modelo.";
  if (!ano(anoFab)) erros.anoFab = "Ano com 4 números, ex.: 2020.";
  if (!ano(anoMod)) erros.anoMod = "Ano com 4 números, ex.: 2021.";
  else if (ano(anoFab) && Number(anoMod) < Number(anoFab)) erros.anoMod = "O ano do modelo não pode ser antes do de fabricação.";
  if (!km) erros.km = "Diga a quilometragem, mesmo que aproximada.";
  if (!intencao) erros.intencao = "Escolha uma opção.";
  if (!quitada) erros.quitada = "Escolha uma opção.";
  if (nome.trim().length < 2) erros.nome = "Escreva o seu nome.";
  if (telefone.length < 10) erros.telefone = "WhatsApp com DDD.";

  const valido = Object.keys(erros).length === 0;
  const erro = (campo: string) => (tentou ? erros[campo] : undefined);

  /* ---------- a mensagem ---------- */

  const linhas = [
    `Olá! Quero ${intencao === "trocar" ? "trocar" : "vender"} minha moto. Preenchi a avaliação no site:`,
    "",
    "*A moto*",
    `${[marca, modelo, versao].map((t) => t.trim()).filter(Boolean).join(" ")}`,
    `Ano: ${anoFab}/${anoMod}`,
    `Km: ${km ? new Intl.NumberFormat("pt-BR").format(Number(km)) : ""}`,
    cor.trim() ? `Cor: ${cor.trim()}` : null,
    placa ? `Placa: ${placa}` : null,
    "",
    "*Situação*",
    quitada === "financiada"
      ? `Financiada${Number(falta) > 0 ? ` (faltam uns ${formatarMoeda(Number(falta))})` : ""}`
      : "Quitada",
    `Documentação em dia: ${simNao(docEmDia)}`,
    `Único dono: ${simNao(unicoDono)} · Manual: ${simNao(manual)} · Chave reserva: ${simNao(chaveReserva)}`,
    `Sinistro ou leilão: ${simNao(sinistro)}`,
    Number(espera) > 0 ? `Espero receber: ${formatarMoeda(Number(espera))}` : null,
    obs.trim() ? `Observações: ${obs.trim()}` : null,
    "",
    "*Contato*",
    `${nome.trim()} · ${telefoneEscrito(telefone)}${cidade.trim() ? ` · ${cidade.trim()}` : ""}`,
    "",
    "Vou mandar as fotos e os vídeos aqui na conversa.",
  ];

  /* null = linha opcional não preenchida; "" = o espaço entre os blocos. */
  const mensagem = linhas.filter((linha) => linha !== null).join("\n");

  /*
   * Guarda a ficha no sistema (tela "Motos oferecidas"), no
   * mesmo toque que abre o WhatsApp. Não espera a resposta nem
   * avisa erro: o WhatsApp é o caminho principal, e a pessoa
   * não pode ficar presa aqui se o banco demorar. "keepalive"
   * deixa o envio terminar mesmo se o celular trocar de app.
   */
  function guardarFicha() {
    fetch("/api/oferecer-moto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        placa, marca, modelo, versao, anoFab, anoMod, km, cor,
        intencao, quitada, falta, docEmDia, unicoDono, manual,
        chaveReserva, sinistro, espera, obs, nome, telefone, cidade,
        site: armadilha,
      }),
    }).catch(() => {});
  }

  return (
    <div className="space-y-12">
      <Bloco titulo="A moto">
        <Campo id="placa" rotulo="Placa" dica="Com a placa a loja já consulta o histórico. Opcional.">
          <input
            id="placa"
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7))}
            placeholder="ABC1D23"
            autoCapitalize="characters"
            autoComplete="off"
            className={`${CAMPO} uppercase tracking-wider`}
          />
        </Campo>

        <Campo id="marca" rotulo="Marca" obrigatorio erro={erro("marca")}>
          <input
            id="marca"
            list="marcas-de-moto"
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            placeholder="Honda"
            autoComplete="off"
            className={CAMPO}
          />
          <datalist id="marcas-de-moto">
            {MARCAS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Campo>

        <Campo id="modelo" rotulo="Modelo" obrigatorio erro={erro("modelo")}>
          <input id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="CG 160 Fan" className={CAMPO} />
        </Campo>

        <Campo id="versao" rotulo="Versão">
          <input id="versao" value={versao} onChange={(e) => setVersao(e.target.value)} placeholder="ESDD, ABS, CBS..." className={CAMPO} />
        </Campo>

        <Campo id="ano-fab" rotulo="Ano de fabricação" obrigatorio erro={erro("anoFab")}>
          <input id="ano-fab" inputMode="numeric" value={anoFab} onChange={(e) => setAnoFab(so(e.target.value, 4))} placeholder="2020" className={CAMPO} />
        </Campo>

        <Campo id="ano-mod" rotulo="Ano do modelo" obrigatorio erro={erro("anoMod")}>
          <input id="ano-mod" inputMode="numeric" value={anoMod} onChange={(e) => setAnoMod(so(e.target.value, 4))} placeholder="2021" className={CAMPO} />
        </Campo>

        <Campo id="km" rotulo="Quilometragem" obrigatorio erro={erro("km")}>
          <input
            id="km"
            inputMode="numeric"
            value={km ? new Intl.NumberFormat("pt-BR").format(Number(km)) : ""}
            onChange={(e) => setKm(so(e.target.value, 7))}
            placeholder="45.000"
            className={CAMPO}
          />
        </Campo>

        <Campo id="cor" rotulo="Cor">
          <input id="cor" value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Preta" className={CAMPO} />
        </Campo>
      </Bloco>

      <Bloco titulo="A situação">
        <Escolha
          rotulo="Você quer"
          obrigatorio
          valor={intencao}
          aoMudar={setIntencao}
          erro={erro("intencao")}
          opcoes={[
            { valor: "vender", nome: "Vender" },
            { valor: "trocar", nome: "Trocar por outra da loja" },
          ]}
        />

        <div>
          <Escolha
            rotulo="A moto está"
            obrigatorio
            valor={quitada}
            aoMudar={setQuitada}
            erro={erro("quitada")}
            opcoes={[
              { valor: "quitada", nome: "Quitada" },
              { valor: "financiada", nome: "Financiada" },
            ]}
          />
          {quitada === "financiada" && (
            <div className="mt-6">
              <Campo id="falta" rotulo="Quanto falta, mais ou menos">
                <CampoMoeda id="falta" value={falta} onChange={setFalta} placeholder="R$ 0,00" className={CAMPO} />
              </Campo>
            </div>
          )}
        </div>

        <Escolha rotulo="Documentação em dia (IPVA, licenciamento)" valor={docEmDia} aoMudar={setDocEmDia} opcoes={SIM_NAO} />
        <Escolha rotulo="Já teve sinistro ou leilão" valor={sinistro} aoMudar={setSinistro} opcoes={SIM_NAO} />
        <Escolha rotulo="Único dono" valor={unicoDono} aoMudar={setUnicoDono} opcoes={SIM_NAO} />
        <Escolha rotulo="Tem manual" valor={manual} aoMudar={setManual} opcoes={SIM_NAO} />
        <Escolha rotulo="Tem chave reserva" valor={chaveReserva} aoMudar={setChaveReserva} opcoes={SIM_NAO} />

        <Campo id="espera" rotulo="Quanto espera receber" dica="Opcional. Ajuda a loja a responder mais rápido.">
          <CampoMoeda id="espera" value={espera} onChange={setEspera} placeholder="R$ 0,00" className={CAMPO} />
        </Campo>

        <div className="sm:col-span-2">
          <Campo id="obs" rotulo="Observações" dica="Revisões feitas, peças trocadas, avarias, acessórios.">
            <textarea
              id="obs"
              value={obs}
              onChange={(e) => setObs(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="Pneus novos, revisão feita em agosto..."
              className={`${CAMPO} resize-none`}
            />
          </Campo>
        </div>
      </Bloco>

      <Bloco titulo="Seus dados">
        <Campo id="nome" rotulo="Nome" obrigatorio erro={erro("nome")}>
          <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como quer ser chamado" autoComplete="name" className={CAMPO} />
        </Campo>

        <Campo id="telefone" rotulo="WhatsApp" obrigatorio erro={erro("telefone")}>
          <input
            id="telefone"
            type="tel"
            inputMode="tel"
            value={telefoneEscrito(telefone)}
            onChange={(e) => setTelefone(so(e.target.value, 11))}
            placeholder="(12) 99999-9999"
            autoComplete="tel-national"
            className={CAMPO}
          />
        </Campo>

        <Campo id="cidade" rotulo="Cidade">
          <input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="São José dos Campos" autoComplete="address-level2" className={CAMPO} />
        </Campo>
      </Bloco>

      {/* Fotos e vídeos vão na conversa: aqui só a lista do que mandar. */}
      <section className="border-t border-white/[.08] pt-8">
        <h2 className="text-[1.35rem] font-semibold tracking-tight text-white sm:text-[1.5rem]">Fotos e vídeos</h2>
        <p className="mt-2 max-w-xl text-[14px] leading-6 suave">
          Você manda na conversa do WhatsApp, logo depois de enviar. Quanto mais
          completo, mais certa sai a proposta.
        </p>
        <ul className="mt-6 grid gap-x-10 gap-y-3 sm:grid-cols-2">
          {FOTOS.map(({ Icone, texto }) => (
            <li key={texto} className="flex items-center gap-3 text-[14.5px] text-white/85">
              <Icone size={17} className="shrink-0 text-[#e0b129]" />
              {texto}
            </li>
          ))}
        </ul>
      </section>

      <div className="border-t border-white/[.08] pt-8">
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
          <label>
            Não preencha
            <input tabIndex={-1} autoComplete="off" value={armadilha} onChange={(e) => setArmadilha(e.target.value)} />
          </label>
        </div>

        {enviado && (
          <p className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#4ade80]/30 bg-[#4ade80]/[.06] px-4 py-3 text-[14px] text-white/90">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#4ade80]" />
            <span>
              Pronto! Envie a mensagem que abriu no WhatsApp e, em seguida, as fotos e os vídeos.
              Se o WhatsApp não abriu, toque no botão de novo.
            </span>
          </p>
        )}

        {tentou && !valido && (
          <p className="mb-5 text-[14px] text-[#f87171]">Faltam alguns campos obrigatórios (marcados com *).</p>
        )}

        <a
          href={linkWhatsApp(mensagem)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            setTentou(true);
            if (!valido) {
              e.preventDefault();
              /* Depois de a tela mostrar os erros, leva até o primeiro. */
              setTimeout(() => {
                document.querySelector("[data-erro]")?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 60);
              return;
            }
            setEnviado(true);
            guardarFicha();
          }}
          className="botao-ouro inline-flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-full px-8 text-[15.5px] sm:w-auto"
        >
          <IconeWhatsApp className="h-5 w-5" />
          {/* No celular o nome inteiro quebrava em duas linhas. */}
          <span className="sm:hidden">Enviar no WhatsApp</span>
          <span className="max-sm:hidden">Enviar para avaliação no WhatsApp</span>
        </a>

        <p className="mt-4 max-w-xl text-[12.5px] leading-5 suave">
          Seus dados ficam só com a equipe da loja, para a avaliação (veja a{" "}
          <a href="/privacidade" className="underline">privacidade</a>). A proposta é sem
          compromisso: você decide se fecha.
        </p>
      </div>
    </div>
  );
}
