/*
 * O que o site mostra de uma moto.
 *
 * A lista e a página da moto escrevem km, ano e nome do mesmo
 * jeito, então isso mora aqui.
 *
 * Só texto e conta: este arquivo é lido também pelo navegador,
 * na lista, então nada de servidor entra nele. As fotos, que
 * precisam do banco, ficam em fotos-site.ts.
 */

/*
 * Numero pode chegar como texto.
 *
 * As funcoes do banco devolvem as colunas com cast, e o
 * PostgREST entrega numeric ora como numero, ora como string,
 * dependendo da precisao. Aceitar os dois aqui evita NaN na
 * tela por causa disso.
 */
type Numerico = number | string | null;

export type MotoSite = {
  id: string;
  marca: string | null;
  modelo: string | null;
  versao: string | null;
  cor: string | null;
  ano_fabricacao: Numerico;
  ano_modelo: Numerico;
  quilometragem: Numerico;
  cilindrada: Numerico;
  preco_anunciado: Numerico;
  possui_manual: boolean | null;
  possui_chave_reserva: boolean | null;
  unico_dono: boolean | null;
  data_entrada: string | null;
};

export function numero(valor: Numerico) {
  if (valor === null || valor === undefined) return null;

  const convertido = Number(valor);

  return Number.isFinite(convertido) ? convertido : null;
}

export function nomeDaMoto(moto: MotoSite) {
  return (
    [moto.marca, moto.modelo, moto.versao]
      .filter(Boolean)
      .join(" ") || "Moto"
  );
}

export function anosDaMoto(moto: MotoSite) {
  const { ano_fabricacao: fab, ano_modelo: mod } = moto;

  if (fab && mod) return `${fab}/${mod}`;

  return String(fab || mod || "—");
}

export function kmDaMoto(valor: Numerico) {
  const km = numero(valor);

  if (km === null) return "—";

  return `${new Intl.NumberFormat("pt-BR").format(
    km
  )} km`;
}
