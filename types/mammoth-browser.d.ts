/*
 * A build de navegador do mammoth não vem com tipos.
 * Só usamos a conversão de .docx para HTML.
 */
declare module 'mammoth/mammoth.browser' {
  export function convertToHtml(input: {
    arrayBuffer: ArrayBuffer
  }): Promise<{
    value: string
    messages: { type: string; message: string }[]
  }>
}
