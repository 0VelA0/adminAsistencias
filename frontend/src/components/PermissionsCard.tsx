import { useState } from 'react'
import type { PermissionRequest } from '../lib/types'
import { formatRange } from '../lib/format'
import { RequestDetailModal, pickNumber, pickText } from './RequestDetailModal'
import type { RequestDetail } from './RequestDetailModal'
import { Icon } from './Icon'

const KIND = { paid: 'Con goce', unpaid: 'Sin goce' } as const

const STATUS = {
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    cancelled: 'Cancelado',
} as const

function toDetail(r: PermissionRequest): RequestDetail {
    return {
        kind: 'permission',
        title: r.kind === 'paid' ? 'Permiso con goce de sueldo' : 'Permiso sin goce de sueldo',
        tag: KIND[r.kind],
        status: r.status,
        start_date: r.start_date,
        end_date: r.end_date,
        days: pickNumber(r, 'days'),
        reason: r.reason,
        created_at: pickText(r, 'created_at'),
        reviewed_at: pickText(r, 'reviewed_at'),
        reviewed_by_name: r.reviewed_by_name,
        comment: pickText(r, 'review_comment', 'admin_comment', 'comment'),
    }
}

export function PermissionsCard({ requests }: { requests: PermissionRequest[] }) {
    const [selected, setSelected] = useState<PermissionRequest | null>(null)
    const latest = requests.slice(0, 5)

    return (
        <article className="dashboard-card permissions-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">PERMISOS</p>
                    <h2>Mis solicitudes de permisos</h2>
                </div>
                <Icon name="file" />
            </div>

            {!latest.length ? (
                <p className="pending-request-empty">Aún no has solicitado permisos.</p>
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
                                    aria-label={`Ver detalle del permiso ${formatRange(r.start_date, r.end_date)}`}
                                    onClick={() => setSelected(r)}
                                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected(r))}
                                >
                                    <td data-label="Tipo"><span className={`kind-dot ${r.kind}`} />{KIND[r.kind]}</td>
                                    <td data-label="Fecha(s)">{formatRange(r.start_date, r.end_date)}</td>
                                    <td data-label="Motivo" className="reason-cell" title={r.reason}>{r.reason}</td>
                                    <td data-label="Estado"><span className={`badge ${r.status}`}>{STATUS[r.status]}</span></td>
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