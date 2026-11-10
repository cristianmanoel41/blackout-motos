/*
 * MANDA VARIÁVEIS DO .env.local PARA A VERCEL
 *
 *   node scripts/enviar-env.mjs OPENAI_API_KEY [OUTRA ...]
 *   node scripts/enviar-env.mjs --listar
 *
 * O valor sai do .env.local deste computador e vai direto para
 * a Vercel (Production, Preview e Development), sem aparecer na
 * tela: o comando mostra só o nome, o tamanho e se deu certo.
 * Assim chave nenhuma precisa ser colada em chat ou print.
 *
 * Usa o VERCEL_TOKEN do próprio .env.local. A variável passa a
 * valer no próximo deploy.
 */

import { readFileSync } from "node:fs";

const PROJETO = "blackout-motos";
const ALVOS = ["production", "preview", "development"];

function lerEnvLocal() {
  const env = {};
  for (const linha of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const achado = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (achado) env[achado[1]] = achado[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = lerEnvLocal();
const token = env.VERCEL_TOKEN;

if (!token) {
  console.error("Falta VERCEL_TOKEN no .env.local.");
  process.exit(1);
}

const api = (caminho, opcoes = {}) =>
  fetch(`https://api.vercel.com${caminho}`, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opcoes.headers || {}),
    },
  });

const nomes = process.argv.slice(2);

async function listar() {
  const resposta = await api(`/v9/projects/${PROJETO}/env`);
  const corpo = await resposta.json();
  if (!resposta.ok) {
    console.error("Erro:", corpo?.error?.message || resposta.status);
    process.exitCode = 1;
    return;
  }
  for (const item of corpo.envs || []) {
    console.log(`${item.key}  (${(item.target || []).join(", ")})`);
  }
}

if (nomes[0] === "--listar") {
  await listar();
} else if (nomes.length === 0) {
  console.error("Diga o nome: node scripts/enviar-env.mjs OPENAI_API_KEY");
  process.exitCode = 1;
} else {
  await enviar();
}

async function enviar() {
  let falhou = false;

  for (const nome of nomes) {
    const valor = env[nome];

    if (!valor) {
      console.error(`${nome}: não está no .env.local (ou está vazia).`);
      falhou = true;
      continue;
    }

    const resposta = await api(`/v10/projects/${PROJETO}/env?upsert=true`, {
      method: "POST",
      body: JSON.stringify({
        key: nome,
        value: valor,
        type: "encrypted",
        target: ALVOS,
      }),
    });

    const corpo = await resposta.json().catch(() => ({}));

    if (resposta.ok) {
      console.log(
        `${nome}: enviada (${valor.length} caracteres) para ${ALVOS.join(", ")}.`,
      );
    } else {
      console.error(
        `${nome}: erro ${resposta.status} - ${corpo?.error?.message || "sem detalhe"}`,
      );
      falhou = true;
    }
  }

  process.exitCode = falhou ? 1 : 0;
}
