import type { summarize } from '../lib/history'
import { Icon } from './Icon'

type Summary = ReturnType<typeof summarize>

export function AttendanceSummaryCard({ summary, onDetails }: { summary: Summary; onDetails: () => void }) {
    const total = summary.total || 1
    const pct = (n: number) => Math.round((n / total) * 100)

    const punctualEnd = (summary.punctual / total) * 100
    const lateEnd = punctualEnd + (summary.late / total) * 100

    const background = summary.total
        ? `conic-gradient(#3fa66b 0 ${punctualEnd}%, #e08a2e ${punctualEnd}% ${lateEnd}%, #d9534f ${lateEnd}% 100%)`
        : 'var(--line-soft)'

    return (
        <article className="dashboard-card summary-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">AÑO ACTUAL</p>
                    <h2>Resumen histórico de asistencia</h2>
                </div>
                <span className="dashboard-card-icon">
                    <Icon name="pie" />
                </span>
            </div>

            <div className="summary-body">
                <div className="donut" style={{ background }}>
                    <div className="donut-inner">
                        <strong>{summary.total ? `${pct(summary.punctual)}%` : '–'}</strong>
                        <span>cumplimiento de horario</span>
                    </div>
                </div>

                <div className="donut-legend">
                    <span><i className="dot ok" /> Puntual: {pct(summary.punctual)}%</span>
                    <span><i className="dot late" /> Retrasos: {pct(summary.late)}%</span>
                    <span><i className="dot absent" /> Faltas: {pct(summary.absent)}%</span>
                </div>
            </div>

            <div className="summary-footer">
                <button type="button" className="link" onClick={onDetails}>
                    Ver detalles de asistencia <Icon name="right" size={14} />
                </button>
            </div>
        </article>
    )
}