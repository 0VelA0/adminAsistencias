import type { summarize } from '../lib/history'

type Summary = ReturnType<typeof summarize>

export function AttendanceSummaryCard({
    summary,
    onDetails,
}: {
    summary: Summary
    onDetails: () => void
}) {
    const total = summary.total || 1
    const pct = (n: number) => Math.round((n / total) * 100)

    const punctualEnd = (summary.punctual / total) * 100
    const lateEnd = punctualEnd + (summary.late / total) * 100

    const background = summary.total
        ? `conic-gradient(#3fa66b 0 ${punctualEnd}%, #e08a2e ${punctualEnd}% ${lateEnd}%, #d9534f ${lateEnd}% 100%)`
        : '#e5eaf3'

    return (
        <article className="dashboard-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">AÑO ACTUAL</p>
                    <h2>Resumen histórico de asistencia</h2>
                </div>
                <span className="dashboard-card-icon">◔</span>
            </div>

            <div className="donut" style={{ background }}>
                <div className="donut-inner">
                    <strong>{summary.total ? `${pct(summary.punctual)}%` : '—'}</strong>
                    <span>cumplimiento de horario</span>
                </div>
            </div>

            <div className="donut-legend">
                <span><i className="dot ok" /> Puntual: {pct(summary.punctual)}%</span>
                <span><i className="dot late" /> Retrasos: {pct(summary.late)}%</span>
                <span><i className="dot absent" /> Faltas: {pct(summary.absent)}%</span>
            </div>

            <button type="button" className="compact permission-btn" onClick={onDetails}>
                Ver detalles de asistencia
            </button>
        </article>
    )
}