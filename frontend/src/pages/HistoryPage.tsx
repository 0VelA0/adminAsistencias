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
import { PageHeader } from '../components/PageHeader'

export function HistoryPage({
    records,
    vacationRequests,
    permissionRequests,
    holidays,
    workDays,
}: {
    records: AttendanceRecord[]
    vacationRequests: VacationRequest[]
    permissionRequests: PermissionRequest[]
    holidays: Set<string>
    workDays: number[]
}) {
    const [filter, setFilter] = useState<HistoryFilter>('all')

    const days = useMemo(
        () => classifyDays(records, [...vacationRequests, ...permissionRequests], holidays, workDays),
        [records, vacationRequests, permissionRequests, holidays, workDays]
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
            <PageHeader eyebrow="HISTORIAL" title="Historial completo" description="Toda tu asistencia y tus solicitudes en un solo lugar." />

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