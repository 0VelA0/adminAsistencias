import type {
    AttendanceRecord,
    AttendanceToday,
    VacationRequest,
    PermissionRequest,
    Page
} from '../lib/types'
import { useAttendanceRegister } from '../lib/useAttendanceRegister'
import { RecordTable } from '../components/RecordTable'
import { AttendanceCard } from '../components/AttendanceCard'
import { VacationSummaryCard } from '../components/VacationSummaryCard'
import { PendingRequestsCard } from '../components/PendingRequestsCard'
import { NewsTicker } from '../components/NewsTicker'


export function EmployeePage({
    token,
    records,
    today,
    onRecord,
    onTodayChange,
    onNavigate,
    vacationRequests,
    onRequestsChange,
    permissionRequests
}: {
    token: string
    records: AttendanceRecord[]
    today: AttendanceToday
    onRecord: (record: AttendanceRecord) => void
    onTodayChange: (today: AttendanceToday) => void
    onNavigate: (page: Page) => void
    vacationRequests: VacationRequest[]
    onRequestsChange: () => Promise<void>
    permissionRequests: PermissionRequest[]
}) {
    const station = new URLSearchParams(
        window.location.search
    ).get('station')

    const { message, working, register, startBreak, endBreak } =
        useAttendanceRegister({ token, today, onRecord, onTodayChange })

    return (
        <>
            <div className="page-heading">
                <div>
                    <p className="eyebrow">DASHBOARD</p>
                    <h2>Panel General</h2>
                </div>
            </div>
            <br />
            <section className="dashboard-grid">

                <AttendanceCard
                    today={today}
                    working={working}
                    isStation={Boolean(station)}
                    onRegisterEntry={() =>
                        station
                            ? register('/qr-attendance', { station })
                            : register('/attendance/entry')
                    }
                    onRegisterExit={() =>
                        station
                            ? register('/qr-attendance', { station })
                            : register('/attendance/exit')
                    }
                    onStartBreak={startBreak}
                    onEndBreak={endBreak}
                />

                <VacationSummaryCard
                    token={token}
                    requests={vacationRequests}
                    onOpen={() => onNavigate('vacations')}
                />

                <PendingRequestsCard
                    vacations={vacationRequests}
                    permissions={permissionRequests}
                    onOpenVacations={() => onNavigate('vacations')}
                    onOpenPermissions={() => onNavigate('attendance')}
                />

            </section>

            {message && <p className="notice">{message}</p>}

            <NewsTicker token={token} onOpen={() => onNavigate('news')} />

            <section>
                <div className="section-title">
                    <h2>Mi historial</h2>

                    <span>
                        {records.length} registros
                    </span>
                </div>

                <RecordTable records={records} />
            </section>

        </>
    )
}