import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { getLocation } from '../lib/location'
import type {
    AttendanceRecord,
    AttendanceToday,
    VacationRequest
} from '../lib/types'
import { RecordList } from '../components/RecordList'
import { VacationSection } from '../components/VacationSection'
import { AttendanceCard } from '../components/AttendanceCard'
import { VacationSummaryCard } from '../components/VacationSummaryCard'

export function EmployeePage({
    token,
    records,
    today,
    onRecord,
    onTodayChange,
}: {
    token: string
    records: AttendanceRecord[]
    today: AttendanceToday
    onRecord: (record: AttendanceRecord) => void
    onTodayChange: (today: AttendanceToday) => void
}) {
    const station = new URLSearchParams(
        window.location.search
    ).get('station')

    const [message, setMessage] = useState('')
    const [working, setWorking] = useState(false)

    const [vacationRequests, setVacationRequests] =
        useState<VacationRequest[]>([])

    const loadVacationRequests = async () => {
        const data = await api<VacationRequest[]>(
            '/vacations/mine',
            {},
            token
        )

        setVacationRequests(data)
    }

    useEffect(() => {
        loadVacationRequests().catch(() => undefined)
    }, [token])

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
            <section className="dashboard-grid">

                <AttendanceCard
                    today={today}
                    working={working}
                    isStation={Boolean(station)}
                    onRegisterEntry={() =>
                        register('/attendance/entry')
                    }
                    onRegisterExit={() =>
                        register('/attendance/exit')
                    }
                />

                <VacationSummaryCard
                    requests={vacationRequests}
                />

                <article className="dashboard-card">

                    <div className="dashboard-card-title">

                        <div>
                            <p className="eyebrow">
                                SOLICITUDES
                            </p>

                            <h2>
                                Solicitudes Pendientes
                            </h2>
                        </div>

                        <span className="dashboard-card-icon">
                            ▣
                        </span>

                    </div>

                    <div className="vacation-summary-placeholder">

                        <strong>
                            Revisa tus solicitudes
                        </strong>

                        <p>
                            Aquí aparecerán tus solicitudes
                            pendientes de aprobación.
                        </p>

                        <button
                            type="button"
                            className="secondary"
                        >
                            Ver solicitudes
                        </button>

                    </div>

                </article>

            </section>

            <section>
                <div className="section-title">
                    <h2>Mi historial</h2>

                    <span>
                        {records.length} registros
                    </span>
                </div>

                <RecordList records={records} />
            </section>

            <VacationSection token={token}/>
        </>
    )
}