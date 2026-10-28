import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatDay, toDate, toMin, ymd } from '../lib/format'
import { deptColors } from '../lib/people'
import { useAsync } from '../lib/useAsync'
import type { Booking, Space, User } from '../lib/types'
import { BookingModal } from './BookingModal'
import { Icon } from './Icon'
import { SpaceTimeline } from './SpaceTimeLine'
import { StateView } from './StatusBlocks'
import { useToast } from './Toast'

function SpaceCard({
    space,
    bookings,
    day,
    now,
    user,
    index,
    onBook,
    onCancel,
}: {
    space: Space
    bookings: Booking[]
    day: string
    now: Date
    user: User
    index: number
    onBook: () => void
    onCancel: (booking: Booking) => void
}) {
    const isToday = day === ymd(now)
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const opensThatDay = space.open_days.includes((toDate(day).getDay() + 6) % 7)
    const closedForToday = isToday && nowMin >= toMin(space.close_time)
    const current = isToday
        ? bookings.find(b => toMin(b.start_time) <= nowMin && nowMin < toMin(b.end_time))
        : undefined

    const status = !opensThatDay
        ? { tone: 'closed', label: 'Cerrado este día' }
        : closedForToday
          ? { tone: 'closed', label: 'Ya cerró por hoy' }
          : current
            ? { tone: 'busy', label: `Ocupada hasta ${current.end_time}` }
            : bookings.length === 0
              ? { tone: 'free', label: 'Libre todo el día' }
              : { tone: 'free', label: isToday ? 'Disponible ahora' : `${bookings.length} ${bookings.length === 1 ? 'reserva' : 'reservas'}` }

    const extraEquipment = space.equipment.length - 3

    return (
        <article className="space-card" style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
            <header className="space-card-head">
                <span className="space-avatar" style={deptColors(space.kind)}>
                    <Icon name="building" size={20} />
                </span>

                <div className="space-title">
                    <h3 title={space.name}>{space.name}</h3>
                    <span className={`space-status ${status.tone}`}>
                        <i /> {status.label}
                    </span>
                </div>
            </header>

            <ul className="space-facts">
                <li><Icon name="users" size={13} /> {space.capacity}</li>
                <li><Icon name="clock" size={13} /> {space.open_time}–{space.close_time}</li>
                <li className="space-location" title={space.location ?? space.kind}>
                    <Icon name="pin" size={13} /> {space.location ?? space.kind}
                </li>
            </ul>

            <div className="space-equipment">
                {space.equipment.length === 0 ? (
                    <span className="chip muted-chip">Sin equipamiento</span>
                ) : (
                    <>
                        {space.equipment.slice(0, 3).map(item => (
                            <span className="chip" key={item}>{item}</span>
                        ))}
                        {extraEquipment > 0 && (
                            <span className="chip muted-chip" title={space.equipment.slice(3).join(', ')}>
                                +{extraEquipment}
                            </span>
                        )}
                    </>
                )}
            </div>

            {opensThatDay ? (
                <SpaceTimeline
                    openTime={space.open_time}
                    closeTime={space.close_time}
                    bookings={bookings}
                    showNow={isToday}
                />
            ) : (
                <div className="space-closed">Este espacio no abre este día.</div>
            )}

            <div className="space-bookings">
                {bookings.length === 0 ? (
                    <p className="space-empty">{opensThatDay ? 'Sin reservas este día.' : ''}</p>
                ) : (
                    <>
                        {bookings.slice(0, 3).map(b => (
                            <div className="space-booking" key={b.id}>
                                <span className="space-booking-time">{b.start_time}</span>

                                <span className="space-booking-text">
                                    <strong>{b.title}</strong>
                                    <small>{b.start_time}–{b.end_time} · {b.user_name}</small>
                                </span>

                                {(b.user_id === user.id || user.role === 'admin') && (
                                    <button
                                        type="button"
                                        className="space-booking-cancel"
                                        aria-label={`Cancelar ${b.title}`}
                                        title="Cancelar reserva"
                                        onClick={() => onCancel(b)}
                                    >
                                        <Icon name="x" size={13} />
                                    </button>
                                )}
                            </div>
                        ))}

                        {bookings.length > 3 && <p className="space-empty">+{bookings.length - 3} reservas más</p>}
                    </>
                )}
            </div>

            <button type="button" className="space-book" disabled={!opensThatDay || closedForToday} onClick={onBook}>
                <Icon name="plus" size={15} /> Reservar
            </button>
        </article>
    )
}

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
    const [now, setNow] = useState(() => new Date())

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60_000)
        return () => clearInterval(id)
    }, [])

    const bookings = useAsync(() => api<Booking[]>(`/bookings?day=${day}`, {}, token), [token, day, tick])

    const strip = Array.from({ length: 7 }, (_, i) =>
        ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i))
    )

    const shift = (delta: number) => {
        const next = toDate(day)
        next.setDate(next.getDate() + delta)
        setDay(ymd(next))
    }

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
            <div className="day-bar">
                <div className="day-strip" role="tablist" aria-label="Elegir día">
                    {strip.map((d, i) => {
                        const date = toDate(d)

                        return (
                            <button
                                key={d}
                                type="button"
                                role="tab"
                                aria-selected={day === d}
                                className={day === d ? 'active' : ''}
                                onClick={() => setDay(d)}
                            >
                                <span>{i === 0 ? 'Hoy' : date.toLocaleDateString('es-MX', { weekday: 'short' })}</span>
                                <strong>{date.getDate()}</strong>
                            </button>
                        )
                    })}
                </div>

                <div className="day-picker-tools">
                    <button type="button" className="secondary compact" aria-label="Día anterior" onClick={() => shift(-1)}>
                        <Icon name="left" size={15} />
                    </button>
                    <input type="date" value={day} onChange={e => e.target.value && setDay(e.target.value)} aria-label="Otra fecha" />
                    <button type="button" className="secondary compact" aria-label="Día siguiente" onClick={() => shift(1)}>
                        <Icon name="right" size={15} />
                    </button>
                </div>
            </div>

            <p className="day-caption cap">{formatDay(day)}</p>

            <StateView state={bookings}>
                {all => (
                    <div className="space-grid" key={day}>
                        {spaces.map((space, i) => (
                            <SpaceCard
                                key={space.id}
                                space={space}
                                bookings={all.filter(b => b.space_id === space.id)}
                                day={day}
                                now={now}
                                user={user}
                                index={i}
                                onBook={() => setBooking(space)}
                                onCancel={cancel}
                            />
                        ))}
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