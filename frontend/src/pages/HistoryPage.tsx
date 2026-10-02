import { useMemo, useState } from 'react'
import type {
    AttendanceRecord,
    PermissionRequest,
    VacationRequest,
} from '../lib/types'
import {
    buildRows,
    classifyDays,
    monthlyTrend,
    summarize,
} from '../lib/history'
import type { HistoryFilter } from '../lib/history'
import { AttendanceSummaryCard } from '../components/AttendanceSummaryCard'
import { RequestsTotalCard } from '../components/RequestsTotalCard'
import { PunctualityTrendCard } from '../components/PunctualityTrendCard'
import { HistoryTable } from '../components/HistoryTable'

export function HistoryPage({
    records,
    vacationRequests,
    permissionRequests,
}: {
    records: AttendanceRecord[]
    vacationRequests: VacationRequest[]
    permissionRequests: PermissionRequest[]
}) {
    const [filter, setFilter] = useState<HistoryFilter>('all')

    const days = useMemo(
        () => classifyDays(records, [...vacationRequests, ...permissionRequests]),
        [records, vacationRequests, permissionRequests]
    )

    const summary = useMemo(() => summarize(days), [days])
    const trend = useMemo(() => monthlyTrend(days), [days])

    const rows = useMemo(
        () => buildRows(records, vacationRequests, permissionRequests, days),
        [records, vacationRequests, permissionRequests, days]
    )

    const showTable = (next: HistoryFilter) => {
        setFilter(next)
        document
            .getElementById('history-table')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    return (
        <div className="page-content">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">HISTORIAL</p>
                    <h2>Panel de Historial Completo</h2>
                    <p className="muted">
                        Consulta todo tu historial de asistencia y solicitudes.
                    </p>
                </div>

                <span className="page-date">
                    {new Date().toLocaleDateString('es-MX', { dateStyle: 'full' })}
                </span>
            </div>

            <section className="dashboard-grid">
                <AttendanceSummaryCard
                    summary={summary}
                    onDetails={() => showTable('attendance')}
                />

                <RequestsTotalCard
                    vacations={vacationRequests}
                    permissions={permissionRequests}
                    onDetails={() => showTable('requests')}
                />

                <PunctualityTrendCard data={trend} />
            </section>

            <HistoryTable rows={rows} filter={filter} onFilterChange={setFilter} />
        </div>
    )
}