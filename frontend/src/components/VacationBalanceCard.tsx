import type { VacationBalance, VacationRequest } from '../lib/types'
import { formatRange } from '../lib/format'

export function VacationBalanceCard({
    balance,
    lastApproved,
    onRequest,
}: {
    balance: VacationBalance | null
    lastApproved?: VacationRequest
    onRequest: () => void
}) {
    return (
        <article className="dashboard-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">SALDO</p>
                    <h2>Días de vacaciones disponibles</h2>
                </div>
                <span className="dashboard-card-icon">🏖️</span>
            </div>

            <div className="balance-main">
                <strong>{balance ? balance.available_days : '…'}</strong>
                <span>
                    {balance
                        ? `de ${balance.total_days} días del ${balance.year}`
                        : 'Cargando…'}
                </span>
            </div>

            <div className="balance-footer">
                <span>
                    {lastApproved
                        ? `Último periodo aprobado: ${formatRange(
                              lastApproved.start_date,
                              lastApproved.end_date
                          )}`
                        : 'Aún no tienes vacaciones aprobadas'}
                </span>

                <button type="button" className="compact" onClick={onRequest}>
                    Solicitar nuevas vacaciones
                </button>
            </div>
        </article>
    )
}