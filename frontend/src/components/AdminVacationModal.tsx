import { useState } from 'react'
import { api } from '../lib/api'
import type { VacationBalanceRow } from '../lib/absences'
import { emit } from '../lib/events'
import { countWorkdays, ymd } from '../lib/format'
import { useToast } from './Toast'

export function AdminVacationModal({
    token,
    balances,
    initialUserId,
    onClose,
}: {
    token: string
    balances: VacationBalanceRow[]
    initialUserId?: number
    onClose: () => void
}) {
    const toast = useToast()
    const [userId, setUserId] = useState(initialUserId ? String(initialUserId) : '')
    const [start, setStart] = useState('')
    const [end, setEnd] = useState('')
    const [reason, setReason] = useState('')
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)

    const chosen = balances.find(b => b.user_id === Number(userId))
    const days = start && end && end >= start ? countWorkdays(start, end) : 0
    const over = Boolean(chosen && days > chosen.available)

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setBusy(true)

        try {
            await api(
                '/vacations/admin',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        user_id: Number(userId),
                        start_date: start,
                        end_date: end,
                        reason: reason.trim() || null,
                        admin_note: note.trim() || null,
                    }),
                },
                token
            )

            emit('requests:changed')
            toast.success(`Vacaciones registradas para ${chosen?.full_name ?? 'la persona'}.`)
            onClose()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudieron registrar.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <form className="modal modal-wide" onClick={e => e.stopPropagation()} onSubmit={submit}>
                <p className="eyebrow">VACACIONES</p>
                <h2>Registrar vacaciones</h2>
                <p className="muted">Quedan aprobadas al instante y la persona recibe un aviso.</p>

                <label>
                    Persona
                    <select value={userId} onChange={e => setUserId(e.target.value)} required>
                        <option value="">Selecciona…</option>
                        {balances.map(b => (
                            <option key={b.user_id} value={b.user_id}>
                                {b.full_name} · {b.available} días disponibles
                            </option>
                        ))}
                    </select>
                </label>

                <div className="modal-row">
                    <label>
                        Desde
                        <input type="date" value={start} min={ymd(new Date())} onChange={e => setStart(e.target.value)} required />
                    </label>
                    <label>
                        Hasta
                        <input type="date" value={end} min={start || ymd(new Date())} onChange={e => setEnd(e.target.value)} required />
                    </label>
                </div>

                {days > 0 && (
                    <p className={`vac-days-hint ${over ? 'over' : ''}`}>
                        ≈ {days} {days === 1 ? 'día hábil' : 'días hábiles'}
                        {chosen && ` · le quedan ${chosen.available}`}
                        {over && ' · excede su saldo'}
                    </p>
                )}

                <label>
                    Motivo (opcional)
                    <input value={reason} onChange={e => setReason(e.target.value)} maxLength={500} />
                </label>

                <label>
                    Nota interna (opcional)
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500} />
                </label>

                <div className="modal-actions">
                    <button type="button" className="secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={busy || !userId || !days || over}>
                        {busy ? 'Guardando…' : 'Registrar vacaciones'}
                    </button>
                </div>
            </form>
        </div>
    )
}