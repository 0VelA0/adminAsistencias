import { useState } from 'react'
import { api } from '../lib/api'
import { formatDay, formatMinutes, fromMin, timeOptions, toMin } from '../lib/format'
import { deptColors } from '../lib/people'
import type { Booking, Space } from '../lib/types'
import { Icon } from './Icon'
import { SpaceTimeline } from './SpaceTimeLine'
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

    const taken = bookings.filter(b => b.space_id === space.id)
    const lastStart = fromMin(toMin(space.close_time) - 15)

    const [start, setStart] = useState(space.open_time)
    const [end, setEnd] = useState(fromMin(Math.min(toMin(space.open_time) + 60, toMin(space.close_time))))
    const [title, setTitle] = useState('')
    const [notes, setNotes] = useState('')
    const [showNotes, setShowNotes] = useState(false)
    const [saving, setSaving] = useState(false)

    const startMin = toMin(start)
    const endMin = toMin(end)
    const overlap = taken.find(b => toMin(b.start_time) < endMin && toMin(b.end_time) > startMin)

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

            toast.success(`Reservaste ${space.name} de ${start} a ${end}.`)
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
            <form className="modal booking-modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
                <header className="booking-head">
                    <span className="space-avatar" style={deptColors(space.kind)}>
                        <Icon name="building" size={22} />
                    </span>

                    <div>
                        <p className="eyebrow">{space.kind.toUpperCase()}</p>
                        <h2>{space.name}</h2>
                        <p className="muted cap">
                            {formatDay(day)} · {space.capacity} personas
                        </p>
                    </div>
                </header>

                <SpaceTimeline
                    openTime={space.open_time}
                    closeTime={space.close_time}
                    bookings={taken}
                    selection={{ start: startMin, end: endMin, clash: Boolean(overlap) }}
                />

                <div className="booking-times">
                    <label>
                        Inicio
                        <select value={start} onChange={e => changeStart(e.target.value)}>
                            {timeOptions(space.open_time, lastStart).map(h => (
                                <option key={h} value={h}>{h}</option>
                            ))}
                        </select>
                    </label>

                    <span className="booking-duration">{formatMinutes(Math.max(0, endMin - startMin))}</span>

                    <label>
                        Fin
                        <select value={end} onChange={e => setEnd(e.target.value)}>
                            {timeOptions(fromMin(startMin + 15), space.close_time).map(h => (
                                <option key={h} value={h}>{h}</option>
                            ))}
                        </select>
                    </label>
                </div>

                {overlap ? (
                    <p className="booking-alert">
                        <Icon name="alert" size={14} /> Se empalma con "{overlap.title}" ({overlap.start_time}–{overlap.end_time}).
                    </p>
                ) : (
                    <p className="availability">
                        <Icon name="check" size={14} /> Horario disponible
                    </p>
                )}

                <label>
                    ¿Para qué es?
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Ej. Revisión semanal del equipo"
                        minLength={2}
                        maxLength={150}
                        required
                    />
                </label>

                {showNotes ? (
                    <label className="step-panel">
                        Notas
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={500} />
                    </label>
                ) : (
                    <button type="button" className="link add-notes" onClick={() => setShowNotes(true)}>
                        <Icon name="plus" size={13} /> Agregar notas
                    </button>
                )}

                <div className="modal-actions">
                    <button type="button" className="secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={saving || Boolean(overlap) || endMin <= startMin}>
                        {saving ? 'Reservando…' : `Reservar ${start}–${end}`}
                    </button>
                </div>
            </form>
        </div>
    )
}