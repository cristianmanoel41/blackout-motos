/*
 * Rascunho do editor de vídeo (pedido de 26/11/2026): sair da tela
 * não perde mais a edição. Fica tudo no IndexedDB do navegador -
 * os ajustes (um objeto simples) e os arquivos de vídeo e música
 * (o localStorage não aguenta arquivo grande; o IndexedDB guarda
 * vários GB). Vale só para aquele computador e navegador, e guarda
 * uma edição por vez, a última.
 */

const BANCO = "editor-video";
const LOJA = "rascunho";

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, falha) => {
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => {
      if (!pedido.result.objectStoreNames.contains(LOJA)) pedido.result.createObjectStore(LOJA);
    };
    pedido.onsuccess = () => ok(pedido.result);
    pedido.onerror = () => falha(pedido.error);
  });
}

async function comLoja<T>(modo: IDBTransactionMode, fazer: (loja: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const banco = await abrir();
  try {
    return await new Promise<T | undefined>((ok, falha) => {
      const transacao = banco.transaction(LOJA, modo);
      const pedido = fazer(transacao.objectStore(LOJA));
      transacao.oncomplete = () => ok(pedido ? pedido.result : undefined);
      transacao.onerror = () => falha(transacao.error);
      transacao.onabort = () => falha(transacao.error);
    });
  } finally {
    banco.close();
  }
}

export async function lerDoRascunho<T>(chave: string): Promise<T | undefined> {
  try {
    return (await comLoja<T>("readonly", (loja) => loja.get(chave) as IDBRequest<T>)) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function gravarNoRascunho(chave: string, valor: unknown): Promise<boolean> {
  try {
    await comLoja("readwrite", (loja) => {
      loja.put(valor, chave);
    });
    return true;
  } catch {
    return false;
  }
}

export async function apagarDoRascunho(chave: string): Promise<void> {
  try {
    await comLoja("readwrite", (loja) => {
      loja.delete(chave);
    });
  } catch {
    /* sem rascunho, nada a apagar */
  }
}

export async function limparRascunho(): Promise<void> {
  try {
    await comLoja("readwrite", (loja) => {
      loja.clear();
    });
  } catch {
    /* idem */
  }
}

/* Quais chaves existem - para apagar os vídeos que saíram da edição. */
export async function chavesDoRascunho(): Promise<string[]> {
  try {
    return ((await comLoja<IDBValidKey[]>("readonly", (loja) => loja.getAllKeys())) || []).map(String);
  } catch {
    return [];
  }
}
