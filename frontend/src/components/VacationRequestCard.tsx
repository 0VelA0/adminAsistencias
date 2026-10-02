import type { VacationRequest } from '../lib/types'
import { STATUS_LABEL, formatRange } from '../lib/format'

export function VacationRequestsCard({
    requests,
}: {
    requests: VacationRequest[]
}) {
    const latest = requests.slice(0, 4)

    return (
        <article className="dashboard-card permissions-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">SOLICITUDES</p>
                    <h2>Mis solicitudes de vacaciones</h2>
                </div>
                <span className="dashboard-card-icon">✎</span>
            </div>

            {!latest.length ? (
                <p className="pending-request-empty">
                    Aún no has solicitado vacaciones.
                </p>
            ) : (
                <div className="permissions-scroll">
                    <table className="permissions-table">
                        <thead>
                            <tr>
                                <th>Fecha(s)</th>
                                <th>Días</th>
                                <th>Motivo</th>
                                <th>Estado</th>
                                <th>Autorizó</th>
                            </tr>
                        </thead>

                        <tbody>
                            {latest.map(r => (
                                <tr key={r.id}>
                                    <td>{formatRange(r.start_date, r.end_date)}</td>
                                    <td>{r.days}</td>
                                    <td className="reason-cell" title={r.reason ?? ''}>
                                        {r.reason ?? '—'}
                                    </td>
                                    <td>
                                        <span className={`badge ${r.status}`}>
                                            {STATUS_LABEL[r.status]}
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