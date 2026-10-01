import { useState } from 'react'
import { api } from '../lib/api'

const todayISO = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
    ).padStart(2, '0')}`
}

export function PermissionModal({
    token,
    onClose,
    onCreated,
}: {
    token: string
    onClose: () => void
    onCreated: () => Promise<void>
}) {
    const [kind, setKind] = useState<'paid' | 'unpaid'>('paid')
    const [start, setStart] = useState(todayISO())
    const [end, setEnd] = useState(todayISO())
    const [reason, setReason] = useState('')
    const [error, setError] = useState('')
    const [sending, setSending] = useState(false)

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setSending(true)
        setError('')

        try {
            await api(
                '/permissions',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        kind,
                        start_date: start,
                        end_date: end,
                        reason,
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
                <p className="eyebrow">PERMISOS</p>
                <h2>Solicitar permiso</h2>

                <label>
                    Tipo
                    <select
                        value={kind}
                        onChange={e => setKind(e.target.value as 'paid' | 'unpaid')}
                    >
                        <option value="paid">Con goce de sueldo</option>
                        <option value="unpaid">Sin goce de sueldo</option>
                    </select>
                </label>

                <div className="modal-row">
                    <label>
                        Desde
                        <input
                            type="date"
                            min={todayISO()}
                            value={start}
                            onChange={e => {
                                setStart(e.target.value)
                                if (end < e.target.value) setEnd(e.target.value)
                            }}
                            required
                        />
                    </label>

                    <label>
                        Hasta
                        <input
                            type="date"
                            min={start}
                            value={end}
                            onChange={e => setEnd(e.target.value)}
                            required
                        />
                    </label>
                </div>

                <label>
                    Motivo
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Ej. Cita médica, trámite oficial…"
                        minLength={3}
                        maxLength={500}
                        rows={3}
                        required
                    />
                </label>

                {error && <p className="error">{error}</p>}

                <div className="modal-actions">
                    <button type="button" className="secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={sending}>
                        {sending ? 'Enviando…' : 'Enviar solicitud'}
                    </button>
                </div>
            </form>
        </div>
    )
}