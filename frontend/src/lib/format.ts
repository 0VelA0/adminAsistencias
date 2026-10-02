export const toDate = (value: string) =>
    new Date(`${value.slice(0, 10)}T00:00:00`)

export const formatDay = (value: string) =>
    toDate(value).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })

export function formatRange(start: string, end: string) {
    const s = toDate(start)
    const e = toDate(end)
    const short: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    const full: Intl.DateTimeFormatOptions = { ...short, year: 'numeric' }

    if (start.slice(0, 10) === end.slice(0, 10)) {
        return s.toLocaleDateString('es-MX', full)
    }

    return `${s.toLocaleDateString('es-MX', short)} – ${e.toLocaleDateString('es-MX', full)}`
}

export function countWorkdays(start: string, end: string) {
    if (!start || !end || end < start) return 0

    const s = toDate(start)
    const total =
        Math.round((toDate(end).getTime() - s.getTime()) / 86_400_000) + 1

    let count = 0
    for (let i = 0; i < total; i++) {
        const day = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i).getDay()
        if (day !== 0 && day !== 6) count++
    }

    return count
}

export const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
    ).padStart(2, '0')}`

export const STATUS_LABEL = {
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    cancelled: 'Cancelado',
} as const

export const initials = (name: string) =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0])
        .join('')
        .toUpperCase()