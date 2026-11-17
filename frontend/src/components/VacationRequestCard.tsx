import { useState } from 'react'
import type { VacationRequest } from '../lib/types'
import { STATUS_LABEL, formatRange } from '../lib/format'
import { RequestDetailModal, pickNumber, pickText } from './RequestDetailModal'
import type { RequestDetail } from './RequestDetailModal'
import { Icon } from './Icon'

function toDetail(r: VacationRequest): RequestDetail {
    return {
        kind: 'vacation',
        title: formatRange(r.start_date, r.end_date),
        status: r.status,
        start_date: r.start_date,
        end_date: r.end_date,
        days: r.days ?? pickNumber(r, 'days'),
        reason: r.reason,
        created_at: pickText(r, 'created_at'),
        reviewed_at: pickText(r, 'reviewed_at'),
        reviewed_by_name: r.reviewed_by_name,
        comment: pickText(r, 'review_comment', 'admin_comment', 'comment'),
    }
}

export function VacationRequestsCard({ requests }: { requests: VacationRequest[] }) {
    const [selected, setSelected] = useState<VacationRequest | null>(null)
    const latest = requests.slice(0, 4)

    return (
        <article className="dashboard-card permissions-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">VACACIONES</p>
                    <h2>Mis solicitudes de vacaciones</h2>
                </div>
                <Icon name="clipboard" />
            </div>

            {!latest.length ? (
                <p className="pending-request-empty">Aún no has solicitado vacaciones.</p>
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
                                <th aria-label="Ver detalle" />
                            </tr>
                        </thead>

                        <tbody>
                            {latest.map(r => (
                                <tr
                                    key={r.id}
                                    className="clickable-row"
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`Ver detalle de vacaciones ${formatRange(r.start_date, r.end_date)}`}
                                    onClick={() => setSelected(r)}
                                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected(r))}
                                >
                                    <td data-label="Fecha(s)">{formatRange(r.start_date, r.end_date)}</td>
                                    <td data-label="Días">{r.days}</td>
                                    <td data-label="Motivo" className="reason-cell" title={r.reason ?? ''}>{r.reason ?? '—'}</td>
                                    <td data-label="Estado"><span className={`badge ${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                                    <td data-label="Autorizó">{r.reviewed_by_name ?? '—'}</td>
                                    <td className="row-chevron" aria-hidden="true"><Icon name="right" size={14} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selected && <RequestDetailModal request={toDetail(selected)} onClose={() => setSelected(null)} />}
        </article>
    )
}