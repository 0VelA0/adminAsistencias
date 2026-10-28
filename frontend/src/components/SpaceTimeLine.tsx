import { fromMin, toMin } from '../lib/format'
import type { Booking } from '../lib/types'

export function SpaceTimeline({
    openTime,
    closeTime,
    bookings,
    selection,
    showNow = false,
}: {
    openTime: string
    closeTime: string
    bookings: Booking[]
    selection?: { start: number; end: number; clash: boolean }
    showNow?: boolean
}) {
    const open = toMin(openTime)
    const close = toMin(closeTime)
    const span = Math.max(close - open, 1)

    const clamp = (m: number) => Math.min(Math.max(m, open), close)
    const left = (m: number) => `${((clamp(m) - open) / span) * 100}%`
    const width = (a: number, b: number) => `${((clamp(b) - clamp(a)) / span) * 100}%`

    const ticks: number[] = []
    for (let m = Math.ceil(open / 120) * 120; m <= close; m += 120) ticks.push(m)

    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()

    return (
        <div className="timeline-wrap">
            <div className="timeline">
                {ticks.map(t => (
                    <span key={t} className="timeline-tick" style={{ left: left(t) }} />
                ))}

                {bookings.map(b => (
                    <span
                        key={b.id}
                        className="timeline-slot"
                        title={`${b.start_time}–${b.end_time} · ${b.title}`}
                        style={{ left: left(toMin(b.start_time)), width: width(toMin(b.start_time), toMin(b.end_time)) }}
                    />
                ))}

                {selection && selection.end > selection.start && (
                    <span
                        className={`timeline-selection ${selection.clash ? 'clash' : ''}`}
                        style={{ left: left(selection.start), width: width(selection.start, selection.end) }}
                    />
                )}

                {showNow && nowMin > open && nowMin < close && (
                    <span className="timeline-now" style={{ left: left(nowMin) }} />
                )}
            </div>

            <div className="timeline-labels" aria-hidden="true">
                {ticks.map(t => (
                    <span key={t} style={{ left: left(t) }}>
                        {fromMin(t).slice(0, 2)}h
                    </span>
                ))}
            </div>
        </div>
    )
}