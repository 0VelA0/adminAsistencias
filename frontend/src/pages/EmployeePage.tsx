import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { getLocation } from '../lib/location'
import type {
    AttendanceRecord,
    AttendanceToday,
    VacationRequest,
    User,
    Page
} from '../lib/types'
import { RecordTable } from '../components/RecordTable'
import { AttendanceCard } from '../components/AttendanceCard'
import { VacationSummaryCard } from '../components/VacationSummaryCard'
import { PendingRequestsCard } from '../components/PendingRequestsCard'


export function EmployeePage({
    token,
    records,
    today,
    onRecord,
    onTodayChange,
    onNavigate,
    vacationRequests,
    onRequestsChange
}: {
    token: string
    records: AttendanceRecord[]
    today: AttendanceToday
    onRecord: (record: AttendanceRecord) => void
    onTodayChange: (today: AttendanceToday) => void
    onNavigate: (page: Page) => void
    vacationRequests: VacationRequest[]
    onRequestsChange: () => Promise<void>
}) {
    const station = new URLSearchParams(
        window.location.search
    ).get('station')

    const [message, setMessage] = useState('')
    const [working, setWorking] = useState(false)


    const register = async (
        path: string,
        body: Record<string, string> = {}
    ) => {
        setWorking(true)
        setMessage('Validando ubicación…')

        try {
            const location = await getLocation()

            const record = await api<AttendanceRecord>(
                path,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        ...location,
                        ...body,
                    }),
                },
                token
            )

            onRecord(record)

            const updatedToday: AttendanceToday = {
                ...today,
                entry:
                    record.kind === 'entry'
                        ? record
                        : today.entry,
                exit:
                    record.kind === 'exit'
                        ? record
                        : today.exit,
            }

            onTodayChange(updatedToday)

            setMessage(
                `${
                    record.kind === 'entry'
                        ? 'Entrada'
                        : 'Salida'
                } registrada correctamente${
                    record.status === 'late'
                        ? ' — marcada como retraso.'
                        : '.'
                }`
            )

            if (station) {
                window.history.replaceState(
                    {},
                    '',
                    window.location.pathname
                )
            }
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : 'No se pudo registrar'
            )
        } finally {
            setWorking(false)
        }
    }

    const hasEntry = today.entry !== null
    const hasExit = today.exit !== null

    const canRegisterEntry =
        !hasEntry &&
        !today.is_on_vacation &&
        !working

    const canRegisterExit =
        hasEntry &&
        !hasExit &&
        !today.is_on_vacation &&
        !working

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
                            ? register('/qr-attendance', {station})
                            : register('/attendance/entry')
                    }
                    onRegisterExit={() =>
                        station
                            ? register('/qr-attendance', {station})
                            : register('/attendance/exit')
                    }
                />

                <VacationSummaryCard
                    requests={vacationRequests}
                />

                <PendingRequestsCard
                    requests={vacationRequests}
                    onViewRequests={() =>
                        onNavigate('vacations')
                    }
                />

            </section>

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