import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import { longDate, toDate, ymd } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { CalendarEvent, Page, User } from '../lib/types'
import { Icon } from '../components/Icon'
import type { IconName } from '../components/Icon'
import { StateView } from '../components/StatusBlocks'
import { PageHeader } from '../components/PageHeader'

const TYPES: Record<CalendarEvent['type'], { label: string; icon: IconName }> = {
    meeting: { label: 'Reunión', icon: 'megaphone' },
    booking: { label: 'Reserva de sala', icon: 'building' },
    vacation: { label: 'Vacaciones', icon: 'sun' },
    permission: { label: 'Permiso', icon: 'file' },
    holiday: { label: 'Festivo', icon: 'calendar' },
    team_absence: { label: 'Ausencia del equipo', icon: 'users' },
    office: { label: 'Día en oficina', icon: 'building' },
}

const WEEK_HEAD = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

function EventItem({ event, onOpen }: { event: CalendarEvent; onOpen: (page: Page) => void }) {
    return (
        <div className={`event-row ${event.type} ${event.pending ? 'pending' : ''}`}>
            <span className="event-icon">
                <Icon name={TYPES[event.type].icon} size={15} />
            </span>

            <div className="person-text">
                <strong>{event.title}</strong>
                <span>
                    {[
                        event.start_time ? `${event.start_time}–${event.end_time}` : 'Todo el día',
                        event.subtitle,
                        TYPES[event.type].label,
                    ]
                        .filter(Boolean)
                        .join(' · ')}
                </span>
            </div>

            {event.page !== 'calendar' && (
                <button type="button" className="link" onClick={() => onOpen(event.page)}>
                    Abrir
                </button>
            )}
        </div>
    )
}

export function CalendarPage({
    token,
    user,
    onNavigate,
}: {
    token: string
    user: User
    onNavigate: (page: Page) => void
}) {
    const today = ymd(new Date())

    const [cursor, setCursor] = useState(() => {
        const d = new Date()
        return new Date(d.getFullYear(), d.getMonth(), 1)
    })
    const [view, setView] = useState<'month' | 'agenda'>(() =>
        window.matchMedia('(max-width: 760px)').matches ? 'agenda' : 'month'
    )
    const [team, setTeam] = useState(false)
    const [selected, setSelected] = useState<string | null>(null)

    const gridStart = addDays(cursor, -((cursor.getDay() + 6) % 7))
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

    const [from, to] =
        view === 'month' ? [ymd(days[0]), ymd(days[41])] : [today, ymd(addDays(new Date(), 45))]

    const events = useAsync(
        () => api<CalendarEvent[]>(`/calendar?start=${from}&end=${to}&team=${team}`, {}, token),
        [token, from, to, team]
    )

    // Un evento de varios días aparece en cada uno de sus días
    const byDay = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>()

        for (const event of events.data ?? []) {
            const last = event.end_date < to ? event.end_date : to

            for (let d = toDate(event.start_date > from ? event.start_date : from); ymd(d) <= last; d = addDays(d, 1)) {
                const key = ymd(d)
                map.set(key, [...(map.get(key) ?? []), event])
            }
        }

        return map
    }, [events.data, from, to])

    const shiftMonth = (delta: number) => setCursor(c => new Date(c.getFullYear(), c.getMonth() + delta, 1))

    const open = (page: Page) => {
        setSelected(null)
        onNavigate(page)
    }

    const agendaDays = [...byDay.keys()].sort()

    return (
        <div className="page-content">

            <PageHeader
                eyebrow="CALENDARIO"
                title="Mi calendario"
                description="Reuniones, reservas, festivos y tus ausencias en un solo lugar."
                actions={
                    <div className="filter-tabs" role="tablist">
                        <button type="button" className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>
                            Mes
                        </button>
                        <button type="button" className={view === 'agenda' ? 'active' : ''} onClick={() => setView('agenda')}>
                            Agenda
                        </button>
                    </div>
                }
            />

            <section className="dashboard-card">
                <div className="calendar-toolbar">
                    {view === 'month' ? (
                        <div className="date-nav">
                            <button type="button" className="secondary compact" aria-label="Mes anterior" onClick={() => shiftMonth(-1)}>
                                <Icon name="left" size={16} />
                            </button>
                            <strong className="calendar-title cap">
                                {cursor.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                            </strong>
                            <button type="button" className="secondary compact" aria-label="Mes siguiente" onClick={() => shiftMonth(1)}>
                                <Icon name="right" size={16} />
                            </button>
                            <button
                                type="button"
                                className="secondary compact"
                                onClick={() => {
                                    const d = new Date()
                                    setCursor(new Date(d.getFullYear(), d.getMonth(), 1))
                                }}
                            >
                                Hoy
                            </button>
                        </div>
                    ) : (
                        <strong className="calendar-title">Próximos 45 días</strong>
                    )}

                    {user.role === 'admin' && (
                        <label className="check-row">
                            <input type="checkbox" checked={team} onChange={e => setTeam(e.target.checked)} />
                            Mostrar ausencias del equipo
                        </label>
                    )}
                </div>

                <div className="calendar-legend">
                    {Object.entries(TYPES)
                        .filter(([type]) => type !== 'team_absence' || team)
                        .map(([type, info]) => (
                            <span key={type} className={`legend-item ${type}`}>
                                <i /> {info.label}
                            </span>
                        ))}
                </div>

                <StateView state={events}>
                    {() =>
                        view === 'month' ? (
                            <div className="month-grid" key={from}>
                                {WEEK_HEAD.map(day => (
                                    <div key={day} className="month-head">{day}</div>
                                ))}

                                {days.map(date => {
                                    const key = ymd(date)
                                    const items = byDay.get(key) ?? []
                                    const outside = date.getMonth() !== cursor.getMonth()

                                    return (
                                        <button
                                            type="button"
                                            key={key}
                                            className={`month-cell ${outside ? 'outside' : ''} ${key === today ? 'today' : ''} ${
                                                date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : ''
                                            }`}
                                            onClick={() => setSelected(key)}
                                        >
                                            <span className="day-number">{date.getDate()}</span>

                                            <span className="cell-events">
                                                {items.slice(0, 3).map(e => (
                                                    <span key={e.id} className={`event-chip ${e.type} ${e.pending ? 'pending' : ''}`}>
                                                        {e.start_time && <b>{e.start_time}</b>} {e.title}
                                                    </span>
                                                ))}
                                                {items.length > 3 && <span className="more-events">+{items.length - 3} más</span>}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        ) : agendaDays.length === 0 ? (
                            <p className="empty">No tienes nada agendado en los próximos días.</p>
                        ) : (
                            <div className="agenda">
                                {agendaDays.map((key, i) => (
                                    <section key={key} className="agenda-day" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
                                        <h3 className={`cap ${key === today ? 'is-today' : ''}`}>
                                            {key === today ? 'Hoy · ' : ''}
                                            {longDate(key)}
                                        </h3>

                                        {(byDay.get(key) ?? []).map(e => (
                                            <EventItem key={e.id} event={e} onOpen={open} />
                                        ))}
                                    </section>
                                ))}
                            </div>
                        )
                    }
                </StateView>
            </section>

            {selected && (
                <div className="drawer-backdrop" onClick={() => setSelected(null)}>
                    <aside className="drawer" onClick={e => e.stopPropagation()} role="dialog" aria-label="Eventos del día">
                        <button type="button" className="secondary compact drawer-close" aria-label="Cerrar" onClick={() => setSelected(null)}>
                            <Icon name="x" size={16} />
                        </button>

                        <div>
                            <p className="eyebrow">{selected === today ? 'HOY' : 'DÍA'}</p>
                            <h2 className="cap drawer-day">{longDate(selected)}</h2>
                        </div>

                        {(byDay.get(selected) ?? []).length === 0 ? (
                            <p className="muted">No hay eventos este día.</p>
                        ) : (
                            <div className="drawer-people">
                                {(byDay.get(selected) ?? []).map(e => (
                                    <EventItem key={e.id} event={e} onOpen={open} />
                                ))}
                            </div>
                        )}
                    </aside>
                </div>
            )}
        </div>
    )
}