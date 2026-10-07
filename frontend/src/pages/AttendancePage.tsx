import { useEffect, useState } from 'react'
import type {
    AttendanceRecord,
    AttendanceToday,
    VacationRequest,
    PermissionRequest
} from '../lib/types'
import { useAttendanceRegister } from '../lib/useAttendanceRegister'
import { AttendanceCard } from '../components/AttendanceCard'
import { MonthlySummaryCard } from '../components/MonthlySummaryCard'
import { AttendanceHistory } from '../components/AttendanceHistory'
import { PermissionsCard } from '../components/PermissionsCard'
import { PermissionModal } from '../components/PermissionModal'

export function AttendancePage({
    token,
    records,
    today,
    onRecord,
    onTodayChange,
    vacationRequests,
    permissionRequests,
    onPermissionsChange
}: {
    token: string
    records: AttendanceRecord[]
    today: AttendanceToday
    onRecord: (record: AttendanceRecord) => void
    onTodayChange: (today: AttendanceToday) => void
    vacationRequests: VacationRequest[],
    permissionRequests: PermissionRequest[],
    onPermissionsChange: () => Promise<void>
}) {
    const station = new URLSearchParams(window.location.search).get('station')
    const [now, setNow] = useState(new Date())
    const [showPermission, setShowPermission] = useState(false)

    const { message, working, register } = useAttendanceRegister({
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
            <div className="page-heading">
                <div>
                    <p className="eyebrow">ASISTENCIA</p>
                    <h2>Panel de Asistencia</h2>
                    <p className="muted">Consulta y registra tu jornada</p>
                </div>

                <div className="dashboard-clock">
                    <strong>
                        {now.toLocaleTimeString('es-MX', { hour12: false })}
                    </strong>
                    <span>
                        {now.toLocaleDateString('es-MX', { dateStyle: 'full' })}
                    </span>
                </div>
            </div>

            {message && <p className="notice">{message}</p>}

            <section className="dashboard-grid">
                <AttendanceCard
                    today={today}
                    working={working}
                    isStation={Boolean(station)}
                    onRegisterEntry={() => 
                        station
                            ? register('/qr-attendance', {station})
                            : register('/attendance/entry')}
                    onRegisterExit={() =>
                        station
                            ? register('/qr-attendance', {station})
                            : register('/attendance/exit')}
                />

                <MonthlySummaryCard
                    records={records}
                    vacationRequests={vacationRequests}
                    permissionRequests={permissionRequests}
                    onRequestPermission={() => setShowPermission(true)}
                />
                <PermissionsCard requests={permissionRequests}/>

                {showPermission && (
                    <PermissionModal
                        token={token}
                        onClose={() => setShowPermission(false)}
                        onCreated={onPermissionsChange}/>
                )}
            </section>

            <AttendanceHistory records={records} />
        </div>
    )
}