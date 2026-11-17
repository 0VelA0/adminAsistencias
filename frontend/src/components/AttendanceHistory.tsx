import { useMemo, useState } from 'react'
import type { AttendanceRecord } from '../lib/types'
import { groupByDay } from '../lib/attendance'
import type { DayRow } from '../lib/attendance'
import { AttendanceDetailModal, locationLabel } from './AttendanceDetailModal'
import { Icon } from './Icon'

const formatDate = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })

const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

export function AttendanceHistory({ records }: { records: AttendanceRecord[] }) {
    const [query, setQuery] = useState('')
    const [selected, setSelected] = useState<DayRow | null>(null)

    const days = useMemo(() => {
        const all = groupByDay(records)
        const q = query.trim().toLowerCase()
        if (!q) return all

        return all.filter(day =>
            [
                formatDate(day.date),
                day.status === 'late' ? 'retardo' : 'puntual',
                locationLabel(day.entry ?? day.exit),
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
                    placeholder="Buscar fecha, estado, ubicación o nota…"
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
                                    <th aria-label="Ver detalle" />
                                </tr>
                            </thead>

                            <tbody>
                                {days.map(day => (
                                    <tr
                                        key={day.date}
                                        className="clickable-row"
                                        tabIndex={0}
                                        role="button"
                                        aria-label={`Ver detalle del ${formatDate(day.date)}`}
                                        onClick={() => setSelected(day)}
                                        onKeyDown={e =>
                                            (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected(day))
                                        }
                                    >
                                        <td data-label="Fecha">{formatDate(day.date)}</td>
                                        <td data-label="Entrada">{day.entry ? formatTime(day.entry.recorded_at) : '—'}</td>
                                        <td data-label="Salida">{day.exit ? formatTime(day.exit.recorded_at) : '—'}</td>
                                        <td data-label="Horas totales">{day.hours}</td>
                                        <td data-label="Ubicación">{locationLabel(day.entry ?? day.exit)}</td>
                                        <td data-label="Estado">
                                            <span className={`badge ${day.status === 'late' ? 'late' : 'normal'}`}>
                                                {day.status === 'late' ? 'Retardo' : 'Puntual'}
                                            </span>
                                        </td>
                                        <td className="row-chevron" aria-hidden="true">
                                            <Icon name="right" size={14} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selected && <AttendanceDetailModal day={selected} onClose={() => setSelected(null)} />}
        </section>
    )
}