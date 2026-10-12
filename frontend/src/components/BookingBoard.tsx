import { useState } from 'react'
import { api } from '../lib/api'
import { formatDay, toDate, toMin, ymd } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { Booking, Space, User } from '../lib/types'
import { BookingModal } from './BookingModal'
import { Icon } from './Icon'
import { StateView } from './StatusBlocks'
import { useToast } from './Toast'

export function BookingBoard({
    token,
    user,
    spaces,
    onChanged,
}: {
    token: string
    user: User
    spaces: Space[]
    onChanged: () => void
}) {
    const toast = useToast()
    const [day, setDay] = useState(ymd(new Date()))
    const [tick, setTick] = useState(0)
    const [booking, setBooking] = useState<Space | null>(null)

    const bookings = useAsync(() => api<Booking[]>(`/bookings?day=${day}`, {}, token), [token, day, tick])

    const shift = (delta: number) => {
        const next = toDate(day)
        next.setDate(next.getDate() + delta)
        setDay(ymd(next))
    }

    const weekday = (toDate(day).getDay() + 6) % 7 // lunes = 0

    const refresh = () => {
        setTick(t => t + 1)
        onChanged()
    }

    const cancel = async (item: Booking) => {
        if (!window.confirm(`¿Cancelar la reserva "${item.title}"?`)) return

        try {
            await api(`/bookings/${item.id}/cancel`, { method: 'POST' }, token)
            toast.success('Reserva cancelada.')
            refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo cancelar.')
        }
    }

    return (
        <section className="space-board">
            <div className="date-nav">
                <button type="button" className="secondary compact" onClick={() => shift(-1)} aria-label="Día anterior">‹</button>
                <input type="date" value={day} onChange={e => e.target.value && setDay(e.target.value)} />
                <button type="button" className="secondary compact" onClick={() => shift(1)} aria-label="Día siguiente">›</button>
                <button type="button" className="secondary compact" onClick={() => setDay(ymd(new Date()))}>Hoy</button>
                <span className="muted date-label">{formatDay(day)}</span>
            </div>

            <StateView state={bookings}>
                {all => (
                    <div className="space-grid">
                        {spaces.map(space => {
                            const open = toMin(space.open_time)
                            const span = toMin(space.close_time) - open
                            const items = all.filter(b => b.space_id === space.id)
                            const opensToday = space.open_days.includes(weekday)

                            return (
                                <article className="dashboard-card space-card" key={space.id}>
                                    <div className="space-head">
                                        <div>
                                            <p className="eyebrow">{space.kind.toUpperCase()}</p>
                                            <h2>{space.name}</h2>
                                        </div>

                                        <span className="dashboard-card-icon">
                                            <Icon name="building" />
                                        </span>
                                    </div>

                                    <div className="space-meta">
                                        <span>{space.capacity} personas</span>
                                        {space.location && <span>{space.location}</span>}
                                        <span>{space.open_time}–{space.close_time}</span>
                                    </div>

                                    {space.equipment.length > 0 && (
                                        <div className="chip-list">
                                            {space.equipment.map(item => (
                                                <span className="chip" key={item}>{item}</span>
                                            ))}
                                        </div>
                                    )}

                                    {opensToday ? (
                                        <>
                                            <div className="timeline" aria-hidden="true">
                                                {items.map(b => (
                                                    <span
                                                        key={b.id}
                                                        className="timeline-slot"
                                                        style={{
                                                            left: `${((toMin(b.start_time) - open) / span) * 100}%`,
                                                            width: `${((toMin(b.end_time) - toMin(b.start_time)) / span) * 100}%`,
                                                        }}
                                                    />
                                                ))}
                                            </div>

                                            <div className="timeline-scale">
                                                <span>{space.open_time}</span>
                                                <span>{space.close_time}</span>
                                            </div>

                                            <div className="slot-list">
                                                {items.length === 0 ? (
                                                    <p className="muted slot-empty">Libre todo el día.</p>
                                                ) : (
                                                    items.map(b => (
                                                        <div className="slot-item" key={b.id}>
                                                            <span className="slot-text">
                                                                <strong>{b.start_time}–{b.end_time}</strong> {b.title}
                                                                <small> · {b.user_name}</small>
                                                            </span>

                                                            {(b.user_id === user.id || user.role === 'admin') && (
                                                                <button type="button" className="link" onClick={() => cancel(b)}>
                                                                    Cancelar
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            <button type="button" className="compact" onClick={() => setBooking(space)}>
                                                Reservar
                                            </button>
                                        </>
                                    ) : (
                                        <p className="pending-request-empty">Este espacio no abre este día.</p>
                                    )}
                                </article>
                            )
                        })}
                    </div>
                )}
            </StateView>

            {booking && (
                <BookingModal
                    token={token}
                    space={booking}
                    day={day}
                    bookings={bookings.data ?? []}
                    onClose={() => setBooking(null)}
                    onSaved={refresh}
                />
            )}
        </section>
    )
}