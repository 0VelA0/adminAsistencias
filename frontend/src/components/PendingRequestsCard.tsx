import { STATUS_LABEL, formatRange } from '../lib/format'
import type { PermissionRequest, VacationRequest } from '../lib/types'
import { Icon } from './Icon'

type Item = {
    key: string
    kind: 'vacation' | 'permission'
    label: string
    range: string
    status: VacationRequest['status']
    created: string
}

const STATS = [
    { status: 'pending', label: 'Pendientes' },
    { status: 'approved', label: 'Aprobadas' },
    { status: 'rejected', label: 'Rechazadas' },
] as const

export function PendingRequestsCard({
    vacations,
    permissions,
    onOpenVacations,
    onOpenPermissions,
}: {
    vacations: VacationRequest[]
    permissions: PermissionRequest[]
    onOpenVacations: () => void
    onOpenPermissions: () => void
}) {
    const all: Item[] = [
        ...vacations.map(v => ({
            key: `v-${v.id}`,
            kind: 'vacation' as const,
            label: 'Vacaciones',
            range: formatRange(v.start_date, v.end_date),
            status: v.status,
            created: v.created_at,
        })),
        ...permissions.map(p => ({
            key: `p-${p.id}`,
            kind: 'permission' as const,
            label: p.kind === 'paid' ? 'Permiso con goce' : 'Permiso sin goce',
            range: formatRange(p.start_date, p.end_date),
            status: p.status,
            created: p.created_at,
        })),
    ]

    const count = (status: string, kind?: Item['kind']) =>
        all.filter(item => item.status === status && (!kind || item.kind === kind)).length

    const recent = [...all].sort((a, b) => b.created.localeCompare(a.created)).slice(0, 3)

    return (
        <article className="dashboard-card summary-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">SOLICITUDES</p>
                    <h2>Mis solicitudes</h2>
                </div>
                <span className="dashboard-card-icon">
                    <Icon name="clipboard" />
                </span>
            </div>

            <div className="summary-body">
                <div className="request-stats">
                    {STATS.map(s => (
                        <div key={s.status} className={`request-stat ${s.status}`}>
                            <strong>{count(s.status)}</strong>
                            <span>{s.label}</span>
                            <small>
                                {count(s.status, 'vacation')} vac. · {count(s.status, 'permission')} perm.
                            </small>
                        </div>
                    ))}
                </div>

                {recent.length === 0 ? (
                    <p className="pending-request-empty">Aún no has hecho solicitudes.</p>
                ) : (
                    <ul className="request-list">
                        {recent.map(item => (
                            <li key={item.key}>
                                <span className={`request-icon ${item.kind}`}>
                                    <Icon name={item.kind === 'vacation' ? 'sun' : 'file'} size={14} />
                                </span>

                                <div>
                                    <strong>{item.label}</strong>
                                    <small>{item.range}</small>
                                </div>

                                <span className={`badge ${item.status}`}>{STATUS_LABEL[item.status]}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="summary-footer split">
                <button type="button" className="link" onClick={onOpenVacations}>
                    Vacaciones <Icon name="right" size={13} />
                </button>
                <button type="button" className="link" onClick={onOpenPermissions}>
                    Permisos <Icon name="right" size={13} />
                </button>
            </div>
        </article>
    )
}