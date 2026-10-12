import type { VacationRequest } from '../lib/types'
import { STATUS_LABEL, formatRange } from '../lib/format'
import { Icon } from './Icon'

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
                <Icon name="clipboard" />
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
                                    <td data-label="Fecha(s)">{formatRange(r.start_date, r.end_date)}</td>
                                    <td data-label="Días">{r.days}</td>
                                    <td data-label="Motivo" className="reason-cell" title={r.reason ?? ''}>{r.reason ?? '—'}</td>
                                    <td data-label="Estado"><span className={`badge ${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                                    <td data-label="Autorizó">{r.reviewed_by_name ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </article>
    )
}