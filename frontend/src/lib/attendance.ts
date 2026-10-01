import type { AttendanceRecord } from './types'

export type DayRow = {
    date: string
    entry: AttendanceRecord | null
    exit: AttendanceRecord | null
    status: 'normal' | 'late'
    hours: string
}

const formatHours = (start: string, end: string) => {
    const minutes = Math.max(
        0,
        Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
    )
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
}

export function groupByDay(records: AttendanceRecord[]): DayRow[] {
    const map = new Map<
        string,
        { entry: AttendanceRecord | null; exit: AttendanceRecord | null }
    >()

    for (const record of records) {
        const key = record.work_date.slice(0, 10)
        const day = map.get(key) ?? { entry: null, exit: null }

        if (record.kind === 'entry') day.entry = record
        else day.exit = record

        map.set(key, day)
    }

    return [...map.entries()]
        .map(([date, { entry, exit }]) => ({
            date,
            entry,
            exit,
            status: entry?.status === 'late' ? ('late' as const) : ('normal' as const),
            hours:
                entry && exit
                    ? formatHours(entry.recorded_at, exit.recorded_at)
                    : '—',
        }))
        .sort((a, b) => b.date.localeCompare(a.date))
}