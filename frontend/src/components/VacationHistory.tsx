import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import type { VacationRequest } from '../lib/types'
import { STATUS_LABEL, formatDay, formatRange } from '../lib/format'

export function VacationHistory({
    token,
    requests,
    onRequestsChange,
}: {
    token: string
    requests: VacationRequest[]
    onRequestsChange: () => Promise<void>
}) {
    const [query, setQuery] = useState('')
    const [working, setWorking] = useState(false)
    const [message, setMessage] = useState('')

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return requests

        return requests.filter(r =>
            [
                formatRange(r.start_date, r.end_date),
                r.reason ?? '',
                STATUS_LABEL[r.status],
                r.reviewed_by_name ?? '',
            ]
                .join(' ')
                .toLowerCase()
                .includes(q)
        )
    }, [requests, query])

    const cancel = async (id: number) => {
        setWorking(true)
        setMessage('')

        try {
            await api<VacationRequest>(
                `/vacations/${id}/cancel`,
                { method: 'POST' },
                token
            )
            await onRequestsChange()
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : 'No se pudo cancelar la solicitud.'
            )
        } finally {
            setWorking(false)
        }
    }

    return (
        <section className="dashboard-card history-card">
            <div className="section-title history-title">
                <h2>Mi historial completo de vacaciones</h2>
                <span>{rows.length} solicitudes</span>
            </div>

            <div className="table-toolbar">
                <input
                    type="search"
                    placeholder="Buscar periodo, motivo o estado…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
            </div>

            {message && <p className="error">{message}</p>}

            {!rows.length ? (
                <p className="empty">No hay solicitudes.</p>
            ) : (
                <div className="table-card">
                    <div className="table-scroll">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Fecha solicitud</th>
                                    <th>Periodo</th>
                                    <th>Días</th>
                                    <th>Motivo</th>
                                    <th>Estado</th>
                                    <th>Autorizado por</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {rows.map(r => (
                                    <tr key={r.id}>
                                        <td data-label="Fecha solicitud">
                                            {formatDay(r.created_at)}
                                        </td>
                                        <td data-label="Periodo">
                                            {formatRange(r.start_date, r.end_date)}
                                        </td>
                                        <td data-label="Días">{r.days}</td>
                                        <td data-label="Motivo">{r.reason ?? '—'}</td>
                                        <td data-label="Estado">
                                            <span className={`badge ${r.status}`}>
                                                {STATUS_LABEL[r.status]}
                                            </span>
                                        </td>
                                        <td data-label="Autorizado por">
                                            {r.reviewed_by_name ?? '—'}
                                        </td>
                                        <td data-label="Acciones">
                                            {r.status === 'pending' ? (
                                                <button
                                                    type="button"
                                                    className="link"
                                                    disabled={working}
                                                    onClick={() => cancel(r.id)}
                                                >
                                                    Cancelar
                                                </button>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    )
}