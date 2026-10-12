import type { PermissionRequest, VacationRequest } from '../lib/types'
import { Icon } from './Icon'

export function RequestsTotalCard({
    vacations,
    permissions,
    onDetails,
}: {
    vacations: VacationRequest[]
    permissions: PermissionRequest[]
    onDetails: () => void
}) {
    return (
        <article className="dashboard-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">SOLICITUDES</p>
                    <h2>Total de solicitudes</h2>
                </div>
                <Icon name="clipboard" />
            </div>

            <div className="balance-main">
                <strong>{vacations.length + permissions.length}</strong>
                <span>Solicitudes históricas</span>
            </div>

            <div className="balance-footer">
                <div className="requests-counts">
                    <span> <Icon name="sun" size={14} /> Vacaciones: {vacations.length}</span>
                    <span> <Icon name="file" size={14} /> Permisos: {permissions.length}</span>
                </div>

                <button type="button" className="compact" onClick={onDetails}>
                    Ver historial de solicitudes
                </button>
            </div>
        </article>
    )
}