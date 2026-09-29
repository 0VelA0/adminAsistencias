import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { VacationRequest } from '../lib/types'

export function VacationSection({
    token,
}: {
    token: string
}) {
    const [requests, setRequests] =
        useState<VacationRequest[]>([])

    const [startDate, setStartDate] =
        useState('')

    const [endDate, setEndDate] =
        useState('')

    const [reason, setReason] =
        useState('')

    const [message, setMessage] =
        useState('')

    const [working, setWorking] =
        useState(false)

    const loadRequests = async () => {
        const data = await api<VacationRequest[]>(
            '/vacations/mine',
            {},
            token
        )

        setRequests(data)
    }

    useEffect(() => {
        loadRequests().catch(() => {
            setMessage(
                'No se pudieron cargar tus solicitudes.'
            )
        })
    }, [token])

    const submitRequest = async (
        event: React.FormEvent
    ) => {
        event.preventDefault()

        setMessage('')

        if (!startDate || !endDate) {
            setMessage(
                'Selecciona la fecha inicial y final.'
            )
            return
        }

        setWorking(true)

        try {
            await api<VacationRequest>(
                '/vacations/requests',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        start_date: startDate,
                        end_date: endDate,
                        reason:
                            reason.trim() || null,
                    }),
                },
                token
            )

            setStartDate('')
            setEndDate('')
            setReason('')

            await loadRequests()

            setMessage(
                'Solicitud de vacaciones enviada correctamente.'
            )
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : 'No se pudo enviar la solicitud.'
            )
        } finally {
            setWorking(false)
        }
    }

    const cancelRequest = async (
        vacationId: number
    ) => {
        setWorking(true)
        setMessage('')

        try {
            await api<VacationRequest>(
                `/vacations/${vacationId}/cancel`,
                {
                    method: 'POST',
                },
                token
            )

            await loadRequests()

            setMessage(
                'Solicitud cancelada correctamente.'
            )
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : 'No se pudo cancelar la solicitud.'
            )
        } finally {
            setWorking(false)
        }
    }

    return (
        <section>
            <div className="section-title">
                <h2>
                    Solicitar vacaciones
                </h2>

                <span>
                    {requests.length} solicitudes
                </span>
            </div>

            <form
                className="card"
                onSubmit={submitRequest}
            >
                <div className="form-grid">
                    <label>
                        Fecha inicial

                        <input
                            type="date"
                            value={startDate}
                            onChange={event =>
                                setStartDate(
                                    event.target.value
                                )
                            }
                            required
                        />
                    </label>

                    <label>
                        Fecha final

                        <input
                            type="date"
                            value={endDate}
                            min={startDate || undefined}
                            onChange={event =>
                                setEndDate(
                                    event.target.value
                                )
                            }
                            required
                        />
                    </label>
                </div>

                <label>
                    Motivo
                    <textarea
                        value={reason}
                        onChange={event =>
                            setReason(
                                event.target.value
                            )
                        }
                        maxLength={500}
                        placeholder="Opcional"
                        rows={3}
                    />
                </label>

                <button
                    type="submit"
                    disabled={working}
                >
                    {working
                        ? 'Enviando…'
                        : 'Solicitar vacaciones'}
                </button>

                {message && (
                    <p className="notice">
                        {message}
                    </p>
                )}
            </form>

            <div className="section-title">
                <h2>
                    Mis solicitudes
                </h2>
            </div>

            {requests.length === 0 ? (
                <p className="muted">
                    Todavía no tienes solicitudes
                    de vacaciones.
                </p>
            ) : (
                <div className="vacation-list">
                    {requests.map(request => (
                        <article
                            className="card"
                            key={request.id}
                        >
                            <div className="section-title">
                                <strong>
                                    {request.start_date}
                                    {' → '}
                                    {request.end_date}
                                </strong>

                                <span>
                                    {request.status ===
                                    'pending'
                                        ? 'Pendiente'
                                        : request.status ===
                                            'approved'
                                          ? 'Aprobada'
                                          : request.status ===
                                              'rejected'
                                            ? 'Rechazada'
                                            : 'Cancelada'}
                                </span>
                            </div>

                            {request.reason && (
                                <p>
                                    <strong>
                                        Motivo:
                                    </strong>{' '}
                                    {request.reason}
                                </p>
                            )}

                            {request.admin_note && (
                                <p>
                                    <strong>
                                        Comentario del administrador:
                                    </strong>{' '}
                                    {request.admin_note}
                                </p>
                            )}

                            {request.status ===
                                'pending' && (
                                <button
                                    className="secondary"
                                    disabled={working}
                                    onClick={() =>
                                        cancelRequest(
                                            request.id
                                        )
                                    }
                                >
                                    Cancelar solicitud
                                </button>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </section>
    )
}