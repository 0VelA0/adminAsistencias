import { ymd } from './format'

export type PeriodKey =
    | 'this-week'
    | 'last-week'
    | 'this-fortnight'
    | 'last-fortnight'
    | 'this-month'
    | 'last-month'
    | 'custom'

export const PERIODS: { key: PeriodKey; label: string }[] = [
    { key: 'this-week', label: 'Esta semana' },
    { key: 'last-week', label: 'Semana pasada' },
    { key: 'this-fortnight', label: 'Quincena actual' },
    { key: 'last-fortnight', label: 'Quincena pasada' },
    { key: 'this-month', label: 'Este mes' },
    { key: 'last-month', label: 'Mes pasado' },
    { key: 'custom', label: 'Personalizado' },
]

export function periodRange(key: Exclude<PeriodKey, 'custom'>, now = new Date()): [string, string] {
    const y = now.getFullYear()
    const m = now.getMonth()
    const d = now.getDate()

    const monday = new Date(y, m, d - ((now.getDay() + 6) % 7))
    const shift = (date: Date, days: number) =>
        new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

    switch (key) {
        case 'this-week':
            return [ymd(monday), ymd(shift(monday, 6))]
        case 'last-week':
            return [ymd(shift(monday, -7)), ymd(shift(monday, -1))]
        case 'this-fortnight':
            return d <= 15
                ? [ymd(new Date(y, m, 1)), ymd(new Date(y, m, 15))]
                : [ymd(new Date(y, m, 16)), ymd(new Date(y, m + 1, 0))]
        case 'last-fortnight':
            return d > 15
                ? [ymd(new Date(y, m, 1)), ymd(new Date(y, m, 15))]
                : [ymd(new Date(y, m - 1, 16)), ymd(new Date(y, m, 0))]
        case 'this-month':
            return [ymd(new Date(y, m, 1)), ymd(new Date(y, m + 1, 0))]
        case 'last-month':
            return [ymd(new Date(y, m - 1, 1)), ymd(new Date(y, m, 0))]
    }
}