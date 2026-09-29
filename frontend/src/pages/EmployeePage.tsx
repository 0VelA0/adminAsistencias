import { useState } from 'react'
import { api } from '../lib/api'
import { getLocation } from '../lib/location'
import type {
    AttendanceRecord,
    AttendanceToday,
} from '../lib/types'
import { RecordList } from '../components/RecordList'
import { VacationSection } from '../components/VacationSection'

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
            <section className="hero">
                <p>
                    {station
                        ? 'Estación: recepción'
                        : `Hoy, ${new Intl.DateTimeFormat(
                              'es-MX',
                              {
                                  dateStyle: 'full',
                              }
                          ).format(new Date())}`}
                </p>

                <h2>
                    {station
                        ? 'Registrar asistencia'
                        : '¿Qué deseas registrar?'}
                </h2>

                {today.is_on_vacation ? (
                    <>
                        <p className="notice">
                            🏖️ Tienes vacaciones aprobadas
                            para hoy.
                        </p>

                        <p className="muted">
                            No puedes registrar asistencia
                            durante un periodo de vacaciones
                            aprobado.
                        </p>
                    </>
                ) : (
                    <p className="muted">
                        {station
                            ? 'Confirma el registro. La hora la toma el servidor y se valida tu ubicación.'
                            : 'Puedes registrar usando tu ubicación desde la oficina.'}
                    </p>
                )}

                {!station && !today.is_on_vacation && (
                    <div className="actions">
                        <button
                            onClick={() =>
                                register(
                                    '/attendance/entry'
                                )
                            }
                            disabled={!canRegisterEntry}
                        >
                            {working
                                ? 'Registrando…'
                                : 'Registrar entrada'}
                        </button>

                        <button
                            className="secondary"
                            onClick={() =>
                                register(
                                    '/attendance/exit'
                                )
                            }
                            disabled={!canRegisterExit}
                        >
                            {working
                                ? 'Registrando…'
                                : 'Registrar salida'}
                        </button>
                    </div>
                )}

                {station &&
                    !today.is_on_vacation && (
                        <div className="actions">
                            <button
                                onClick={() =>
                                    register(
                                        '/qr-attendance',
                                        {
                                            station,
                                        }
                                    )
                                }
                                disabled={
                                    working ||
                                    (hasEntry && hasExit)
                                }
                            >
                                {working
                                    ? 'Registrando…'
                                    : hasEntry && hasExit
                                      ? 'Jornada completada'
                                      : hasEntry
                                        ? 'Confirmar salida'
                                        : 'Confirmar entrada'}
                            </button>
                        </div>
                    )}

                {!today.is_on_vacation &&
                    hasEntry &&
                    !hasExit && (
                        <p className="notice">
                            ✓ Entrada registrada. Ahora
                            puedes registrar tu salida.
                        </p>
                    )}

                {!today.is_on_vacation &&
                    hasEntry &&
                    hasExit && (
                        <p className="notice">
                            ✓ Jornada completada.
                        </p>
                    )}

                {message && (
                    <p className="notice">
                        {message}
                    </p>
                )}
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