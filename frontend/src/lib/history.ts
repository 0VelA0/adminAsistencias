import type {
    AttendanceRecord,
    PermissionRequest,
    VacationRequest,
} from './types'
import { groupByDay } from './attendance'
import { STATUS_LABEL, countWorkdays, formatRange, toDate, ymd } from './format'

/* ---------- Clasificación de días ---------- */

export type DayStatus = 'punctual' | 'late' | 'absent'
export type ClassifiedDay = { date: string; status: DayStatus }

type Range = { start_date: string; end_date: string; status: string }

export function classifyDays(
    records: AttendanceRecord[],
    ranges: Range[],
    now = new Date()
): ClassifiedDay[] {
    const rows = groupByDay(records).filter(r =>
        r.date.startsWith(String(now.getFullYear()))
    )

    if (!rows.length) return []

    const byDate = new Map(rows.map(r => [r.date, r]))
    const approved = ranges.filter(r => r.status === 'approved')
    const today = ymd(now)
    const first = rows[rows.length - 1].date // groupByDay ordena de más reciente a más antiguo

    const result: ClassifiedDay[] = []

    for (
        let d = toDate(first);
        ymd(d) <= today;
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    ) {
        const key = ymd(d)
        const row = byDate.get(key)

        if (row) {
            if (row.entry) {
                result.push({
                    date: key,
                    status: row.status === 'late' ? 'late' : 'punctual',
                })
            }
            continue
        }

        const weekday = d.getDay()
        if (weekday === 0 || weekday === 6 || key === today) continue

        const covered = approved.some(
            r =>
                r.start_date.slice(0, 10) <= key &&
                r.end_date.slice(0, 10) >= key
        )
        if (covered) continue

        result.push({ date: key, status: 'absent' })
    }

    return result
}

export function summarize(days: ClassifiedDay[]) {
    const count = (s: DayStatus) => days.filter(d => d.status === s).length

    return {
        total: days.length,
        punctual: count('punctual'),
        late: count('late'),
        absent: count('absent'),
    }
}

export function monthlyTrend(days: ClassifiedDay[]) {
    const result: { month: number; pct: number }[] = []

    for (let month = 0; month < 12; month++) {
        const inMonth = days.filter(d => Number(d.date.slice(5, 7)) === month + 1)
        if (!inMonth.length) continue

        const punctual = inMonth.filter(d => d.status === 'punctual').length
        result.push({ month, pct: Math.round((punctual / inMonth.length) * 100) })
    }

    return result
}

/* ---------- Filas consolidadas ---------- */

export type HistoryKind = 'attendance' | 'vacation' | 'permission'
export type HistoryFilter = 'all' | 'attendance' | 'requests' | 'vacation' | 'permission'

export type HistoryRow = {
    id: string
    sortKey: string
    kind: HistoryKind
    icon: string
    title: string
    detail: string
    amount: string
    label: string
    badge: string
    lines: string[]
}

export function matchesFilter(row: HistoryRow, filter: HistoryFilter) {
    if (filter === 'all') return true
    if (filter === 'requests') return row.kind !== 'attendance'
    return row.kind === filter
}

const time = (value: string) =>
    new Date(value).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
    })

export function buildRows(
    records: AttendanceRecord[],
    vacations: VacationRequest[],
    permissions: PermissionRequest[],
    days: ClassifiedDay[]
): HistoryRow[] {
    const rows: HistoryRow[] = []

    for (const day of groupByDay(records)) {
        const done = Boolean(day.entry && day.exit)
        const late = day.status === 'late'

        const detail = day.entry
            ? `Entrada ${time(day.entry.recorded_at)}${
                  day.exit
                      ? ` · Salida ${time(day.exit.recorded_at)}`
                      : ' · Jornada en curso'
              }`
            : `Salida ${time(day.exit!.recorded_at)}`

        const lines = [day.entry, day.exit].flatMap(r =>
            r
                ? [
                      `${r.kind === 'entry' ? 'Entrada' : 'Salida'}: ${
                          r.source === 'admin'
                              ? 'registro manual'
                              : `a ${Math.round(r.distance_meters)} m de la oficina (precisión ${Math.round(
                                    r.accuracy_meters
                                )} m)`
                      }${r.note ? ` · Nota: ${r.note}` : ''}`,
                  ]
                : []
        )

        rows.push({
            id: `a-${day.date}`,
            sortKey: day.date,
            kind: 'attendance',
            icon: '🕒',
            title: 'Asistencia diaria',
            detail,
            amount: day.hours === '—' ? '—' : `${day.hours} h`,
            label: late ? 'Retraso' : done ? 'Completado' : 'En curso',
            badge: late ? 'late' : done ? 'approved' : 'pending',
            lines,
        })
    }

    for (const day of days.filter(d => d.status === 'absent')) {
        rows.push({
            id: `f-${day.date}`,
            sortKey: day.date,
            kind: 'attendance',
            icon: '⚠️',
            title: 'Falta',
            detail: 'Sin registro de asistencia',
            amount: '—',
            label: 'Falta',
            badge: 'rejected',
            lines: [
                'No se registró entrada y no había vacaciones ni permisos aprobados ese día.',
            ],
        })
    }

    for (const v of vacations) {
        rows.push({
            id: `v-${v.id}`,
            sortKey: v.created_at.slice(0, 10),
            kind: 'vacation',
            icon: '🏖️',
            title: 'Solicitud de vacaciones',
            detail: `Periodo ${formatRange(v.start_date, v.end_date)}`,
            amount: `${v.days} días`,
            label: STATUS_LABEL[v.status],
            badge: v.status,
            lines: [
                v.reason ? `Motivo: ${v.reason}` : '',
                v.reviewed_by_name ? `Autorizó: ${v.reviewed_by_name}` : '',
                v.admin_note ? `Comentario del administrador: ${v.admin_note}` : '',
            ].filter(Boolean),
        })
    }

    for (const p of permissions) {
        rows.push({
            id: `p-${p.id}`,
            sortKey: p.created_at.slice(0, 10),
            kind: 'permission',
            icon: '📝',
            title: `Permiso ${p.kind === 'paid' ? 'con goce' : 'sin goce'}`,
            detail: p.reason,
            amount: `${countWorkdays(p.start_date, p.end_date)} días`,
            label: STATUS_LABEL[p.status],
            badge: p.status,
            lines: [
                `Periodo: ${formatRange(p.start_date, p.end_date)}`,
                p.reviewed_by_name ? `Autorizó: ${p.reviewed_by_name}` : '',
                p.admin_note ? `Comentario del administrador: ${p.admin_note}` : '',
            ].filter(Boolean),
        })
    }

    return rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey))
}