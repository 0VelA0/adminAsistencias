import { useState } from 'react'
import { api } from '../lib/api'
import { countWorkdays } from '../lib/format'
import type { VacationRequest } from '../lib/types'

export function VacationModal({
    token,
    available,
    onClose,
    onCreated,
}: {
    token: string
    available: number | null
    onClose: () => void
    onCreated: () => Promise<void>
}) {
    const [start, setStart] = useState('')
    const [end, setEnd] = useState('')
    const [reason, setReason] = useState('')
    const [error, setError] = useState('')
    const [sending, setSending] = useState(false)

    const days = countWorkdays(start, end)
    const over = available !== null && days > available

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setSending(true)
        setError('')

        try {
            await api<VacationRequest>(
                '/vacations/requests',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        start_date: start,
                        end_date: end,
                        reason: reason.trim() || null,
                    }),
                },
                token
            )

            await onCreated()
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo enviar')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <form
                className="modal"
                onClick={e => e.stopPropagation()}
                onSubmit={submit}
            >
                <p className="eyebrow">VACACIONES</p>
                <h2>Solicitar vacaciones</h2>

                <div className="modal-row">
                    <label>
                        Fecha inicial
                        <input
                            type="date"
                            value={start}
                            onChange={e => {
                                setStart(e.target.value)
                                if (end && end < e.target.value) setEnd(e.target.value)
                            }}
                            required
                        />
                    </label>

                    <label>
                        Fecha final
                        <input
                            type="date"
                            value={end}
                            min={start || undefined}
                            onChange={e => setEnd(e.target.value)}
                            required
                        />
                    </label>
                </div>

                <p className={`vac-days-hint ${over ? 'over' : ''}`}>
                    {days > 0
                        ? `${days} día${days === 1 ? '' : 's'} laborable${days === 1 ? '' : 's'}`
                        : 'Selecciona el periodo'}
                    {available !== null && ` · Disponibles: ${available}`}
                    {over && ' · Excede tu saldo'}
                </p>

                <label>
                    Motivo
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        maxLength={500}
                        placeholder="Opcional"
                        rows={3}
                    />
                </label>

                {error && <p className="error">{error}</p>}

                <div className="modal-actions">
                    <button type="button" className="secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={sending || over || days === 0}>
                        {sending ? 'Enviando…' : 'Enviar solicitud'}
                    </button>
                </div>
            </form>
        </div>
    )
}