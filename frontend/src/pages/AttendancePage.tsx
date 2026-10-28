import { useEffect, useState } from 'react'
import type {
    AttendanceRecord,
    AttendanceToday,
    VacationRequest,
    PermissionRequest
} from '../lib/types'
import { api } from '../lib/api'
import { useAttendanceRegister } from '../lib/useAttendanceRegister'
import { AttendanceCard } from '../components/AttendanceCard'
import { MonthlySummaryCard } from '../components/MonthlySummaryCard'
import { AttendanceHistory } from '../components/AttendanceHistory'
import { PermissionsCard } from '../components/PermissionsCard'
import { PermissionModal } from '../components/PermissionModal'
import { OfficeDaysCard } from '../components/OfficeDaysCard'
import { PageHeader } from '../components/PageHeader'

export function AttendancePage({
    token,
    records,
    today,
    onRecord,
    onTodayChange,
    vacationRequests,
    permissionRequests,
    holidays,
    onPermissionsChange,
    workDays,
}: {
    token: string
    records: AttendanceRecord[]
    today: AttendanceToday
    onRecord: (record: AttendanceRecord) => void
    onTodayChange: (today: AttendanceToday) => void
    vacationRequests: VacationRequest[],
    permissionRequests: PermissionRequest[],
    holidays: Set<string>,
    onPermissionsChange: () => Promise<void>
    workDays: number[]
}) {
    const station = new URLSearchParams(window.location.search).get('station')
    const [now, setNow] = useState(new Date())
    const [showPermission, setShowPermission] = useState(false)

    // CAMBIO 1: ahora también sacamos startBreak y endBreak
    const { message, working, register, startBreak, endBreak } = useAttendanceRegister({
        token,
        today,
        onRecord,
        onTodayChange,
    })

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

    return (
        <div className="page-content">
            <PageHeader eyebrow="ASISTENCIA" title="Panel de Asistencia" description="Consulta y registra tu jornada." />

            {message && <p className="notice">{message}</p>}

            <section className="dashboard-grid">
                <AttendanceCard
                    today={today}
                    working={working}
                    isStation={Boolean(station)}
                    onRegisterEntry={() =>
                        station
                            ? register('/qr-attendance', { station })
                            : register('/attendance/entry')}
                    onRegisterExit={() =>
                        station
                            ? register('/qr-attendance', { station })
                            : register('/attendance/exit')}
                    onStartBreak={startBreak}   // CAMBIO 2
                    onEndBreak={endBreak}       // CAMBIO 2
                />

                <MonthlySummaryCard
                    records={records}
                    vacationRequests={vacationRequests}
                    permissionRequests={permissionRequests}
                    onRequestPermission={() => setShowPermission(true)}
                    holidays={holidays}
                    workDays={workDays}
                />
                <PermissionsCard requests={permissionRequests}/>

                {showPermission && (
                    <PermissionModal
                        token={token}
                        onClose={() => setShowPermission(false)}
                        onCreated={onPermissionsChange}/>
                )}
            </section>

            {today.work_mode === 'hybrid' && (
                <OfficeDaysCard
                    token={token}
                    onChanged={() => api<AttendanceToday>('/attendance/today', {}, token).then(onTodayChange).catch(() => undefined)}
                />
            )}

            <AttendanceHistory records={records} />
        </div>
    )
}