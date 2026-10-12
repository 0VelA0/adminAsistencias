import { useState } from 'react'
import { api } from '../lib/api'
import { formatDay, fromMin, timeOptions, toMin } from '../lib/format'
import type { Booking, Space } from '../lib/types'
import { useToast } from './Toast'

export function BookingModal({
    token,
    space,
    day,
    bookings,
    onClose,
    onSaved,
}: {
    token: string
    space: Space
    day: string
    bookings: Booking[]
    onClose: () => void
    onSaved: () => void
}) {
    const toast = useToast()

    const lastStart = fromMin(toMin(space.close_time) - 15)
    const [start, setStart] = useState(space.open_time)
    const [end, setEnd] = useState(fromMin(Math.min(toMin(space.open_time) + 60, toMin(space.close_time))))
    const [title, setTitle] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    const taken = bookings.filter(b => b.space_id === space.id)

    const overlap = taken.find(b => toMin(b.start_time) < toMin(end) && toMin(b.end_time) > toMin(start))

    const changeStart = (value: string) => {
        setStart(value)

        if (toMin(end) <= toMin(value)) {
            setEnd(fromMin(Math.min(toMin(value) + 60, toMin(space.close_time))))
        }
    }

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setSaving(true)

        try {
            await api(
                '/bookings',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        space_id: space.id,
                        booking_date: day,
                        start_time: start,
                        end_time: end,
                        title: title.trim(),
                        notes: notes.trim() || null,
                    }),
                },
                token
            )

            toast.success('Reserva confirmada.')
            onSaved()
            onClose()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo reservar.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <form className="modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
                <p className="eyebrow">{space.kind.toUpperCase()}</p>
                <h2>Reservar {space.name}</h2>

                <p className="muted">
                    {formatDay(day)} · Disponible de {space.open_time} a {space.close_time}
                </p>

                {taken.length > 0 && (
                    <div className="notice">
                        Ocupado ese día:{' '}
                        {taken.map(b => `${b.start_time}–${b.end_time} (${b.user_name})`).join(', ')}
                    </div>
                )}

                <div className="modal-row">
                    <label>
                        Inicio
                        <select value={start} onChange={e => changeStart(e.target.value)}>
                            {timeOptions(space.open_time, lastStart).map(h => (
                                <option key={h} value={h}>{h}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Fin
                        <select value={end} onChange={e => setEnd(e.target.value)}>
                            {timeOptions(fromMin(toMin(start) + 15), space.close_time).map(h => (
                                <option key={h} value={h}>{h}</option>
                            ))}
                        </select>
                    </label>
                </div>

                {overlap && (
                    <p className="error">
                        Se empalma con una reserva de {overlap.start_time} a {overlap.end_time}.
                    </p>
                )}

                <label>
                    Título de la reunión
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Revisión semanal" minLength={2} maxLength={150} required />
                </label>

                <label>
                    Notas (opcional)
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={500} />
                </label>

                <div className="modal-actions">
                    <button type="button" className="secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={saving || Boolean(overlap)}>
                        {saving ? 'Reservando…' : 'Confirmar reserva'}
                    </button>
                </div>
            </form>
        </div>
    )
}