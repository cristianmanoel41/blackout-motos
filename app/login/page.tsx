'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './login.module.css'

export default function LoginPage() {
  return (
    <Suspense>
      <Formulario />
    </Suspense>
  )
}

function Formulario() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  /* Quem chega com ?expirou=1 foi posto para fora pelo
     prazo de 24 horas, nao errou a senha. Sem dizer isso,
     o tranco de volta para o login parece defeito. */
  const expirou = useSearchParams().get('expirou') === '1'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    setCarregando(false)

    if (error) {
      setErro('E-mail ou senha incorretos. Verifique e tente novamente.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="altura-minima-da-tela flex items-center justify-center px-4">
      <div className={styles.moldura}>
        <div className={styles.cartao}>
          <div className={styles.fio} />

          <div className={styles.corpo}>
            {/* O nome da loja saiu daqui: a logo fica logo acima, e
                escrever duas vezes o mesmo nome e o que mais tirava
                o ar profissional da tela. */}
            <p className={styles.titulo}>Acesse o painel de gestão</p>

            {expirou && !erro && (
              <p className={styles.aviso}>
                Seu acesso durou 24 horas e venceu. Entre de novo para
                continuar.
              </p>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className={styles.campo}>
                <label className={styles.rotulo} htmlFor="email">
                  E-mail
                </label>

                <div className={styles.caixa}>
                  <span className={styles.icone}>
                    <Mail size={17} strokeWidth={2.2} />
                  </span>

                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.entrada}
                    placeholder="seuemail@exemplo.com"
                  />
                </div>
              </div>

              <div className={styles.campo}>
                <label className={styles.rotulo} htmlFor="senha">
                  Senha
                </label>

                <div className={styles.caixa}>
                  <span className={styles.icone}>
                    <Lock size={17} strokeWidth={2.2} />
                  </span>

                  <input
                    id="senha"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className={styles.entrada}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {erro && <p className={styles.erro}>{erro}</p>}

              <button
                type="submit"
                disabled={carregando}
                className={styles.entrar}
              >
                {carregando ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
