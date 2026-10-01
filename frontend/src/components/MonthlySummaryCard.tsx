import type { AttendanceRecord, VacationRequest,PermissionRequest } from '../lib/types'
import { groupByDay } from '../lib/attendance'
import { PermissionModal } from './PermissionModal';

type Range = {start_date: string; end_date: string; status:string}
const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
    ).padStart(2, '0')}`

function workdaysSoFar(ranges: Range[]) {
    const now = new Date()
    const approved = ranges.filter(r => r.status === 'approved')
    let count = 0

    for (let day = 1; day <= now.getDate(); day++) {
        const date = new Date(now.getFullYear(), now.getMonth(), day)
        const weekday = date.getDay()
        if (weekday === 0 || weekday === 6) continue

        const key = ymd(date)
        const onVacation = approved.some(
            v =>
                v.start_date.slice(0, 10) <= key &&
                v.end_date.slice(0, 10) >= key
        )
        if (!onVacation) count++
    }

    return count
}

export function MonthlySummaryCard({
    records,
    vacationRequests,
    permissionRequests,
    onRequestPermission
}: {
    records: AttendanceRecord[]
    vacationRequests: VacationRequest[]
    permissionRequests: PermissionRequest[]
    onRequestPermission: () => void
}) {
    const prefix = ymd(new Date()).slice(0, 7)
    const days = groupByDay(records).filter(d => d.date.startsWith(prefix))

    const workdays = workdaysSoFar([...vacationRequests, ...permissionRequests])

    const punctual = days.filter(d => d.entry && d.status === 'normal').length
    const late = days.filter(d => d.status === 'late').length


    const punctualPct = workdays ? (punctual / workdays) * 100 : 0
    const attendedPct = workdays ? ((punctual + late) / workdays) * 100 : 0

    const level =
        punctualPct >= 90 ? 'Alto' : punctualPct >= 75 ? 'Medio' : 'Bajo'

    return (
        <article className="dashboard-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">RESUMEN</p>
                    <h2>Resumen mensual</h2>
                </div>
                <span className="dashboard-card-icon">◔</span>
            </div>

            <div
                className="donut"
                style={{
                    background: `conic-gradient(#3fa66b 0 ${punctualPct}%, #f0a030 ${punctualPct}% ${attendedPct}%, #e5eaf3 ${attendedPct}% 100%)`,
                }}
            >
                <div className="donut-inner">
                    <strong>{punctual}</strong>
                    <span>de {workdays} días</span>
                </div>
            </div>

            <div className="donut-legend">
                <span><i className="dot ok" /> Puntual: {punctual}</span>
                <span><i className="dot late" /> Retraso: {late}</span>
            </div>

            <p className="donut-level">
                Índice de puntualidad <strong>{level}</strong>
            </p>

            <button type="button" className="compact permission-btn" onClick={onRequestPermission}>
                Solicitar nuevo permiso
            </button>
        </article>
    )
}