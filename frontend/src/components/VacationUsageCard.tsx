import type { VacationBalance } from '../lib/types'

export function VacationUsageCard({
    balance,
}: {
    balance: VacationBalance | null
}) {
    const total = balance?.total_days || 1
    const usedPct = ((balance?.used_days ?? 0) / total) * 100
    const pendingPct = ((balance?.pending_days ?? 0) / total) * 100
    const upTo = usedPct + pendingPct

    return (
        <article className="dashboard-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">AÑO ACTUAL</p>
                    <h2>Días de vacaciones usados</h2>
                </div>
                <span className="dashboard-card-icon">◔</span>
            </div>

            <div
                className="donut"
                style={{
                    background: `conic-gradient(#e08a2e 0 ${usedPct}%, #f3d36b ${usedPct}% ${upTo}%, #3fa66b ${upTo}% 100%)`,
                }}
            >
                <div className="donut-inner">
                    <strong>{balance?.used_days ?? 0}</strong>
                    <span>de {balance?.total_days ?? 0} días usados</span>
                </div>
            </div>

            <div className="donut-legend">
                <span><i className="dot used" /> Usados: {balance?.used_days ?? 0}</span>
                <span><i className="dot pending" /> Pendientes: {balance?.pending_days ?? 0}</span>
                <span><i className="dot free" /> Disponibles: {balance?.available_days ?? 0}</span>
            </div>
        </article>
    )
}