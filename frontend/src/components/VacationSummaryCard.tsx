import { api } from '../lib/api'
import { formatRange, ymd } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { VacationBalance, VacationRequest } from '../lib/types'
import { Icon } from './Icon'

export function VacationSummaryCard({
    token,
    requests,
    onOpen,
}: {
    token: string
    requests: VacationRequest[]
    onOpen: () => void
}) {
    const balance = useAsync(() => api<VacationBalance>('/vacations/balance', {}, token), [token, requests])
    const b = balance.data
    const today = ymd(new Date())

    const next = [...requests]
        .filter(r => r.status === 'approved' && r.end_date.slice(0, 10) >= today)
        .sort((a, c) => a.start_date.localeCompare(c.start_date))[0]

    const share = (days: number) => (b && b.total_days ? `${(days / b.total_days) * 100}%` : '0%')

    return (
        <article className="dashboard-card summary-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">VACACIONES</p>
                    <h2>Mis vacaciones</h2>
                </div>
                <span className="dashboard-card-icon">
                    <Icon name="sun" />
                </span>
            </div>

            <div className="summary-body">
                <div className="balance-hero">
                    <strong>{b ? b.available_days : '–'}</strong>
                    <span>días disponibles{b ? ` de ${b.total_days} en ${b.year}` : ''}</span>
                </div>

                <div className="stack-bar" aria-hidden="true">
                    <span className="used" style={{ width: share(b?.used_days ?? 0) }} />
                    <span className="pending" style={{ width: share(b?.pending_days ?? 0) }} />
                </div>

                <div className="stack-legend">
                    <span><i className="used" /> Usados {b?.used_days ?? 0}</span>
                    <span><i className="pending" /> Pendientes {b?.pending_days ?? 0}</span>
                    <span><i className="free" /> Libres {b?.available_days ?? 0}</span>
                </div>

                <div className={`next-box ${next ? '' : 'empty'}`}>
                    <Icon name={next ? 'sun' : 'calendar'} size={16} />
                    <div>
                        <span>{next ? 'Próximas vacaciones' : 'Sin vacaciones programadas'}</span>
                        {next && (
                            <strong>
                                {formatRange(next.start_date, next.end_date)} · {next.days} días
                            </strong>
                        )}
                    </div>
                </div>
            </div>

            <div className="summary-footer">
                <button type="button" className="compact" onClick={onOpen}>
                    <Icon name="plus" size={14} /> Solicitar vacaciones
                </button>
            </div>
        </article>
    )
}