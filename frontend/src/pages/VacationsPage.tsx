import type { VacationRequest } from '../lib/types'
import { VacationSection } from '../components/VacationSection'

export function VacationsPage({
    token,
    requests,
    onRequestsChange,
}: {
    token: string
    requests: VacationRequest[]
    onRequestsChange: () => Promise<void>
}) {
    const pending = requests.filter(
        request => request.status === 'pending'
    ).length

    const approved = requests.filter(
        request => request.status === 'approved'
    ).length

    const rejected = requests.filter(
        request => request.status === 'rejected'
    ).length

    return (
        <div className="page-content">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">
                        VACACIONES
                    </p>

                    <h2>
                        Mis vacaciones
                    </h2>

                    <p className="muted">
                        Solicita tus periodos de vacaciones
                        y consulta el estado de tus solicitudes.
                    </p>
                </div>
            </div>

            <section className="vacation-overview">
                <article className="overview-card">
                    <span className="overview-icon pending">
                        ◷
                    </span>

                    <div>
                        <strong>{pending}</strong>
                        <span>Pendientes</span>
                    </div>
                </article>

                <article className="overview-card">
                    <span className="overview-icon approved">
                        ✓
                    </span>

                    <div>
                        <strong>{approved}</strong>
                        <span>Aprobadas</span>
                    </div>
                </article>

                <article className="overview-card">
                    <span className="overview-icon rejected">
                        ×
                    </span>

                    <div>
                        <strong>{rejected}</strong>
                        <span>Rechazadas</span>
                    </div>
                </article>
            </section>

            <VacationSection
                token={token}
                requests={requests}
                onRequestsChange={onRequestsChange}
            />
        </div>
    )
}