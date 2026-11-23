import { useMemo } from 'react'
import { addDaysYmd, daysBetween, kindLabel } from '../lib/absences'
import type { Absence } from '../lib/absences'
import { formatRange, toDate, ymd } from '../lib/format'
import type { Person } from '../lib/types'
import { Avatar } from './Avatar'
import { Icon } from './Icon'

export function AbsenceTimeline({
    absences,
    people,
    from,
    span,
    onOpen,
}: {
    absences: Absence[]
    people: Map<number, Person>
    from: string
    span: number
    onOpen: (a: Absence) => void
}) {
    const to = addDaysYmd(from, span - 1)
    const today = ymd(new Date())

    const rows = useMemo(() => {
        const groups = new Map<string, Absence[]>()

        for (const a of absences) {
            if ((a.status !== 'approved' && a.status !== 'pending') || a.end < from || a.start > to) continue
            const key = `${a.userId}|${a.name}`
            groups.set(key, [...(groups.get(key) ?? []), a])
        }

        return [...groups.values()]
            .map(items => items.sort((x, y) => x.start.localeCompare(y.start)))
            .sort((x, y) => x[0].start.localeCompare(y[0].start))
    }, [absences, from, to])

    const pct = (day: string) => (daysBetween(from, day) / span) * 100
    const ticks = Array.from({ length: Math.ceil(span / 7) }, (_, i) => addDaysYmd(from, i * 7))
    const showToday = today >= from && today <= to

    if (!rows.length) {
        return (
            <div className="overview-empty">
                <Icon name="calendar" size={22} />
                <p>Nadie tiene vacaciones ni permisos en este periodo.</p>
            </div>
        )
    }

    return (
        <div className="tl-scroll">
            <div className="tl">
                <div className="tl-row tl-head">
                    <span className="tl-person">Persona</span>
                    <div className="tl-track">
                        {ticks.map(t => (
                            <span key={t} className="tl-tick" style={{ left: `${pct(t)}%` }}>
                                {toDate(t).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                            </span>
                        ))}
                    </div>
                </div>

                {rows.map((items, i) => {
                    const first = items[0]
                    const person = people.get(first.userId)

                    return (
                        <div className="tl-row" key={`${first.userId}|${first.name}`} style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                            <div className="tl-person">
                                <Avatar user={{ full_name: first.name, avatar: person?.avatar ?? null }} size="sm" />
                                <span>
                                    <strong>{first.name}</strong>
                                    <small>{person?.department ?? 'Sin área'}</small>
                                </span>
                            </div>

                            <div className="tl-track">
                                {ticks.map(t => (
                                    <i key={t} className="tl-grid" style={{ left: `${pct(t)}%` }} />
                                ))}
                                {showToday && <i className="tl-today" style={{ left: `${pct(today)}%` }} />}

                                {items.map(a => {
                                    const s = a.start < from ? from : a.start
                                    const e = a.end > to ? to : a.end

                                    return (
                                        <button
                                            key={a.key}
                                            type="button"
                                            className={`tl-bar ${a.kind} ${a.status}`}
                                            style={{ left: `${pct(s)}%`, width: `${((daysBetween(s, e) + 1) / span) * 100}%` }}
                                            title={`${kindLabel(a)} · ${formatRange(a.start, a.end)}${a.status === 'pending' ? ' · pendiente' : ''}`}
                                            onClick={() => onOpen(a)}
                                        >
                                            <span>{a.days} d</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}