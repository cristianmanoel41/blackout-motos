import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import "./blackout-brand-final.css";
import GlobalBackButton from '@/components/GlobalBackButton'
import AppShell from '@/components/AppShell'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Blackout Motos',
  description: 'Sistema de Gestão Blackout Motos',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  /*
   * A capa do site marca aqui que a pagina tem JS, antes do
   * primeiro quadro, para o titulo nao aparecer escrito e ser
   * apagado em seguida para ser digitado. Isso acontece antes
   * da hidratacao, entao o React veria uma etiqueta a mais no
   * <html> e acusaria diferenca - so nesta etiqueta.
   */
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          antialiased
        `}
      >
        <AppShell>
          {children}
        </AppShell>

        <GlobalBackButton />
      </body>
    </html>
  )
}