import AcessosDoSite from '../AcessosDoSite'
import styles from '../dashboard.module.css'

/*
 * Todas as métricas do site, numa tela só.
 *
 * A dashboard mostra apenas o dia de hoje. Aqui fica o resto:
 * 7 e 30 dias, simulações por período, motos mais vistas, de
 * onde vem a gente e os gráficos. O login é conferido pelo
 * layout de /dashboard, que vale para esta tela também.
 */
export default function AcessosPage() {
  return (
    <div className={`${styles.dashboard} mx-auto w-full max-w-[1720px] space-y-4 pb-6`}>
      <AcessosDoSite completo />
    </div>
  )
}
