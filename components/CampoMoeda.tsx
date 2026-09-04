"use client";

import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";
import {
  mascaraMoeda,
  valorDaMascara,
} from "@/lib/formatadores/moeda";

/*
 * Campo de dinheiro.
 *
 * Digitar 2087 mostra 20,87: os números entram pela direita e
 * as duas últimas casas viram os centavos. Ninguém precisa
 * lembrar da vírgula nem contar zero.
 *
 * Por fora ele se comporta como o campo de número que estava
 * aqui antes: o onChange devolve o valor cru ("20.87"), então
 * quem salva continua fazendo Number(...) como sempre fez.
 */

function textoDeNumero(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") {
    return "";
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) return "";

  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: string | number | null | undefined;
  onChange: (valor: string) => void;
};

export default function CampoMoeda({
  value,
  onChange,
  ...resto
}: Props) {
  const [texto, setTexto] = useState(() =>
    textoDeNumero(value)
  );

  /*
   * O que este campo devolveu por último. Serve para saber se
   * o valor que chegou de fora é novidade - uma ficha que
   * carregou, um campo que foi limpo - ou só o eco do que a
   * pessoa acabou de digitar.
   */
  const ultimoEmitido = useRef(
    value === null || value === undefined
      ? ""
      : String(value)
  );

  useEffect(() => {
    const externo =
      value === null || value === undefined
        ? ""
        : String(value);

    if (externo === ultimoEmitido.current) return;

    setTexto(textoDeNumero(value));
    ultimoEmitido.current = externo;
  }, [value]);

  function digitou(bruto: string) {
    const mascarado = mascaraMoeda(bruto);

    setTexto(mascarado);

    const emitido = mascarado
      ? String(valorDaMascara(mascarado))
      : "";

    ultimoEmitido.current = emitido;
    onChange(emitido);
  }

  return (
    <input
      {...resto}
      type="text"
      inputMode="numeric"
      value={texto}
      onChange={(evento) => digitou(evento.target.value)}
    />
  );
}
