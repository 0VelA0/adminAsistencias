import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { VacationBalance, VacationRequest } from '../lib/types'
import { LiveClock } from '../components/LiveClock'
import { VacationBalanceCard } from '../components/VacationBalanceCard'
import { VacationUsageCard } from '../components/VacationUsageCard'
import { VacationRequestsCard } from '../components/VacationRequestCard'
import { VacationHistory } from '../components/VacationHistory'
import { VacationModal } from '../components/VacationModal'

export function VacationsPage({
    token,
    requests,
    onRequestsChange,
}: {
    token: string
    requests: VacationRequest[]
    onRequestsChange: () => Promise<void>
}) {
    const [balance, setBalance] = useState<VacationBalance | null>(null)
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        api<VacationBalance>('/vacations/balance', {}, token)
            .then(setBalance)
            .catch(() => setBalance(null))
    }, [token, requests])

    const lastApproved = [...requests]
        .filter(r => r.status === 'approved')
        .sort((a, b) => b.start_date.localeCompare(a.start_date))[0]

    return (
        <div className="page-content">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">VACACIONES</p>
                    <h2>Panel de Vacaciones</h2>
                    <p className="muted">
                        Consulta tu saldo, solicita periodos y revisa el estado de tus solicitudes.
                    </p>
                </div>

                <LiveClock />
            </div>

            <section className="dashboard-grid">
                <VacationBalanceCard
                    balance={balance}
                    lastApproved={lastApproved}
                    onRequest={() => setShowModal(true)}
                />

                <VacationUsageCard balance={balance} />

                <VacationRequestsCard requests={requests} />
            </section>

            <VacationHistory
                token={token}
                requests={requests}
                onRequestsChange={onRequestsChange}
            />

            {showModal && (
                <VacationModal
                    token={token}
                    available={balance?.available_days ?? null}
                    onClose={() => setShowModal(false)}
                    onCreated={onRequestsChange}
                />
            )}
        </div>
    )
}