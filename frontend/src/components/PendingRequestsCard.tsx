import type { VacationRequest } from '../lib/types'

export function PendingRequestsCard({
    requests,
    onViewRequests,
}: {
    requests: VacationRequest[]
    onViewRequests: () => void
}) {
    const pendingRequests = requests.filter(
        request => request.status === 'pending'
    )

    const nextRequest = pendingRequests[0]

    return (
        <article
            className="dashboard-card pending-requests-card"
            onClick={onViewRequests}
        >
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">
                        SOLICITUDES
                    </p>

                    <h2>
                        Solicitudes pendientes
                    </h2>
                </div>

                <span className="dashboard-card-icon">
                    ▣
                </span>
            </div>

            <div className="pending-request-main">
                <strong>
                    {pendingRequests.length}
                </strong>

                <span>
                    {pendingRequests.length === 1
                        ? 'solicitud pendiente'
                        : 'solicitudes pendientes'}
                </span>
            </div>

            {nextRequest ? (
                <div className="pending-request-preview">
                    <span>
                        Próxima solicitud
                    </span>

                    <strong>
                        {nextRequest.start_date}
                        {' → '}
                        {nextRequest.end_date}
                    </strong>

                    {nextRequest.reason && (
                        <small>
                            {nextRequest.reason}
                        </small>
                    )}
                </div>
            ) : (
                <div className="pending-request-empty">
                    No tienes solicitudes pendientes.
                </div>
            )}

            <div className="dashboard-card-link">
                Ver mis solicitudes →
            </div>
        </article>
    )
}