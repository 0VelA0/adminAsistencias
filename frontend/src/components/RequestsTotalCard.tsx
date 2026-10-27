import type { PermissionRequest, VacationRequest } from '../lib/types'
import { Icon } from './Icon'

const STATS = [
    { status: 'pending', label: 'Pendientes' },
    { status: 'approved', label: 'Aprobadas' },
    { status: 'rejected', label: 'Rechazadas' },
] as const

export function RequestsTotalCard({
    vacations,
    permissions,
    onDetails,
}: {
    vacations: VacationRequest[]
    permissions: PermissionRequest[]
    onDetails: () => void
}) {
    const all = [...vacations, ...permissions]
    const total = all.length
    const count = (status: string) => all.filter(r => r.status === status).length
    const vacationShare = total ? (vacations.length / total) * 100 : 0

    return (
        <article className="dashboard-card summary-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">SOLICITUDES</p>
                    <h2>Total de solicitudes</h2>
                </div>
                <span className="dashboard-card-icon">
                    <Icon name="clipboard" />
                </span>
            </div>

            <div className="summary-body">
                <div className="balance-hero">
                    <strong>{total}</strong>
                    <span>{total === 1 ? 'solicitud en total' : 'solicitudes en total'}</span>
                </div>

                <div className="split-bar" aria-hidden="true">
                    <span style={{ width: `${vacationShare}%` }} />
                </div>

                <div className="split-legend">
                    <span>
                        <i className="vac" /> <Icon name="sun" size={13} /> Vacaciones <b>{vacations.length}</b>
                    </span>
                    <span>
                        <i className="perm" /> <Icon name="file" size={13} /> Permisos <b>{permissions.length}</b>
                    </span>
                </div>

                <div className="request-stats">
                    {STATS.map(s => (
                        <div key={s.status} className={`request-stat ${s.status}`}>
                            <strong>{count(s.status)}</strong>
                            <span>{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="summary-footer">
                <button type="button" className="link" onClick={onDetails}>
                    Ver historial de solicitudes <Icon name="right" size={14} />
                </button>
            </div>
        </article>
    )
}