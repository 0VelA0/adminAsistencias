import { Fragment, useMemo, useState } from 'react'
import type { AttendanceRecord } from '../lib/types'
import { groupByDay } from '../lib/attendance'

const formatDate = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })

const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
    })

export function AttendanceHistory({
    records,
}: {
    records: AttendanceRecord[]
}) {
    const [query, setQuery] = useState('')
    const [openDate, setOpenDate] = useState<string | null>(null)

    const days = useMemo(() => {
        const all = groupByDay(records)
        const q = query.trim().toLowerCase()
        if (!q) return all

        return all.filter(day =>
            [
                formatDate(day.date),
                day.status === 'late' ? 'retraso' : 'puntual',
                day.entry?.note ?? '',
                day.exit?.note ?? '',
            ]
                .join(' ')
                .toLowerCase()
                .includes(q)
        )
    }, [records, query])

    return (
        <section className="dashboard-card history-card">
            <div className="section-title history-title">
                <h2>Mi historial completo de asistencia</h2>
                <span>{days.length} días</span>
            </div>

            <div className="table-toolbar">
                <input
                    type="search"
                    placeholder="Buscar fecha, estado o nota…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
            </div>

            {!days.length ? (
                <p className="empty">No hay registros.</p>
            ) : (
                <div className="table-card">
                    <div className="table-scroll">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Entrada</th>
                                    <th>Salida</th>
                                    <th>Horas totales</th>
                                    <th>Ubicación</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {days.map(day => {
                                    const open = openDate === day.date
                                    const first = day.entry ?? day.exit

                                    return (
                                        <Fragment key={day.date}>
                                            <tr>
                                                <td data-label="Fecha">
                                                    {formatDate(day.date)}
                                                </td>
                                                <td data-label="Entrada">
                                                    {day.entry
                                                        ? formatTime(day.entry.recorded_at)
                                                        : '—'}
                                                    {day.status === 'late' && ' ⏱'}
                                                </td>
                                                <td data-label="Salida">
                                                    {day.exit
                                                        ? formatTime(day.exit.recorded_at)
                                                        : '—'}
                                                </td>
                                                <td data-label="Horas totales">
                                                    {day.hours}
                                                </td>
                                                <td data-label="Ubicación">
                                                    {first?.source === 'admin'
                                                        ? 'Registro manual'
                                                        : 'Oficina Central'}
                                                </td>
                                                <td data-label="Estado">
                                                    <span
                                                        className={`badge ${
                                                            day.status === 'late' ? 'late' : 'normal'
                                                        }`}
                                                    >
                                                        {day.status === 'late'
                                                            ? 'Retraso'
                                                            : 'Puntual'}
                                                    </span>
                                                </td>
                                                <td data-label="Acciones">
                                                    <button
                                                        type="button"
                                                        className="link"
                                                        onClick={() =>
                                                            setOpenDate(open ? null : day.date)
                                                        }
                                                    >
                                                        {open ? 'Ocultar' : 'Ver detalles'}
                                                    </button>
                                                </td>
                                            </tr>

                                            {open && (
                                                <tr className="detail-row">
                                                    <td colSpan={7}>
                                                        {[day.entry, day.exit].map(
                                                            r =>
                                                                r && (
                                                                    <p key={r.id}>
                                                                        <strong>
                                                                            {r.kind === 'entry'
                                                                                ? 'Entrada'
                                                                                : 'Salida'}
                                                                            :
                                                                        </strong>{' '}
                                                                        a {Math.round(r.distance_meters)} m
                                                                        de la oficina (precisión{' '}
                                                                        {Math.round(r.accuracy_meters)} m)
                                                                        {r.note && ` · Nota: ${r.note}`}
                                                                    </p>
                                                                )
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    )
}