import type { PermissionRequest } from '../lib/types'

const KIND = { paid: 'Con goce', unpaid: 'Sin goce' } as const

const STATUS = {
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    cancelled: 'Cancelado',
} as const

const toDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00`)

function formatRange(start: string, end: string) {
    const s = toDate(start)
    const e = toDate(end)
    const short: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    const full: Intl.DateTimeFormatOptions = { ...short, year: 'numeric' }

    if (start.slice(0, 10) === end.slice(0, 10)) {
        return s.toLocaleDateString('es-MX', full)
    }

    return `${s.toLocaleDateString('es-MX', short)} – ${e.toLocaleDateString('es-MX', full)}`
}

export function PermissionsCard({
    requests,
}: {
    requests: PermissionRequest[]
}) {
    const latest = requests.slice(0, 5)

    return (
        <article className="dashboard-card permissions-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">PERMISOS</p>
                    <h2>Mis solicitudes de permisos</h2>
                </div>
                <span className="dashboard-card-icon">✎</span>
            </div>

            {!latest.length ? (
                <p className="pending-request-empty">
                    Aún no has solicitado permisos.
                </p>
            ) : (
                <div className="permissions-scroll">
                    <table className="permissions-table">
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Fecha(s)</th>
                                <th>Motivo</th>
                                <th>Estado</th>
                                <th>Autorizó</th>
                            </tr>
                        </thead>

                        <tbody>
                            {latest.map(r => (
                                <tr key={r.id}>
                                    <td>
                                        <span className={`kind-dot ${r.kind}`} />
                                        {KIND[r.kind]}
                                    </td>
                                    <td>{formatRange(r.start_date, r.end_date)}</td>
                                    <td className="reason-cell" title={r.reason}>
                                        {r.reason}
                                    </td>
                                    <td>
                                        <span className={`badge ${r.status}`}>
                                            {STATUS[r.status]}
                                        </span>
                                    </td>
                                    <td>{r.reviewed_by_name ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </article>
    )
}