import type { VacationRequest } from '../lib/types'

export function VacationSummaryCard({
    requests,
}: {
    requests: VacationRequest[]
}) {
    const pendingRequests = requests.filter(
        request => request.status === 'pending'
    )

    const approvedRequests = requests.filter(
        request => request.status === 'approved'
    )

    const rejectedRequests = requests.filter(
        request => request.status === 'rejected'
    )

    return (
        <article className="dashboard-card">

            <div className="dashboard-card-title">

                <div>
                    <p className="eyebrow">
                        SOLICITUDES
                    </p>

                    <h2>
                        Mis solicitudes
                    </h2>
                </div>

                <span className="dashboard-card-icon">
                    ▣
                </span>

            </div>


            <div className="vacation-stats">

                <div>
                    <strong>
                        {pendingRequests.length}
                    </strong>

                    <span>
                        Pendientes
                    </span>
                </div>

                <div>
                    <strong>
                        {approvedRequests.length}
                    </strong>

                    <span>
                        Aprobadas
                    </span>
                </div>

                <div>
                    <strong>
                        {rejectedRequests.length}
                    </strong>

                    <span>
                        Rechazadas
                    </span>
                </div>

            </div>


            {pendingRequests.length > 0 ? (
                <div className="vacation-next-request">

                    <span>
                        Próxima solicitud pendiente
                    </span>

                    <strong>
                        {pendingRequests[0].start_date}
                        {' → '}
                        {pendingRequests[0].end_date}
                    </strong>

                </div>
            ) : (
                <div className="vacation-no-pending">
                    No tienes solicitudes pendientes.
                </div>
            )}

        </article>
    )
}