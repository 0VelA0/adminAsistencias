import { api } from './api'
import { useAppEvent } from './events'
import { countWorkdays, formatRange, toDate, ymd } from './format'
import { useAsync } from './useAsync'
import type { Person } from './types'
import type { RequestDetail } from '../components/RequestDetailModal'

export type AbsenceKind = 'vacation' | 'permission'
export type AbsenceStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type Absence = {
    key: string
    id: number
    kind: AbsenceKind
    userId: number
    name: string
    email: string | null
    start: string
    end: string
    days: number
    status: AbsenceStatus
    paid: boolean | null
    reason: string | null
    comment: string | null
    reviewedBy: string | null
    reviewedAt: string | null
    createdAt: string | null
}

export type VacationBalanceRow = {
    user_id: number
    full_name: string
    avatar: string | null
    department: string | null
    position: string | null
    hire_date: string | null
    year: number
    entitlement: number
    used: number
    pending: number
    available: number
}

type Raw = Record<string, unknown>

const text = (r: Raw, ...keys: string[]) => {
    for (const k of keys) {
        const v = r[k]
        if (typeof v === 'string' && v.trim()) return v
    }
    return null
}

function normalize(r: Raw, kind: AbsenceKind): Absence {
    const start = String(r.start_date).slice(0, 10)
    const end = String(r.end_date).slice(0, 10)

    return {
        key: `${kind}-${r.id}`,
        id: Number(r.id),
        kind,
        userId: typeof r.user_id === 'number' ? r.user_id : -1,
        name: text(r, 'user_name', 'full_name') ?? 'Sin nombre',
        email: text(r, 'user_email', 'email'),
        start,
        end,
        days: typeof r.days === 'number' ? r.days : countWorkdays(start, end),
        status: r.status as AbsenceStatus,
        paid: kind === 'permission' ? r.kind === 'paid' : null,
        reason: text(r, 'reason'),
        comment: text(r, 'admin_note', 'review_comment', 'comment'),
        reviewedBy: text(r, 'reviewed_by_name'),
        reviewedAt: text(r, 'reviewed_at'),
        createdAt: text(r, 'created_at'),
    }
}

export const addDaysYmd = (day: string, n: number) => {
    const d = toDate(day)
    d.setDate(d.getDate() + n)
    return ymd(d)
}

export const daysBetween = (a: string, b: string) =>
    Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000)

export const isActiveOn = (a: Absence, day: string) => a.status === 'approved' && a.start <= day && a.end >= day

/** Fecha en que se resolvió (o se creó, si nunca se revisó). */
export const resolvedOn = (a: Absence) => (a.reviewedAt ?? a.createdAt ?? a.start).slice(0, 10)

export const kindLabel = (a: Absence) =>
    a.kind === 'vacation' ? 'Vacaciones' : a.paid ? 'Permiso con goce' : 'Permiso sin goce'

export function toRequestDetail(a: Absence, person?: Person): RequestDetail {
    return {
        kind: a.kind,
        title: a.kind === 'vacation' ? formatRange(a.start, a.end) : kindLabel(a),
        tag: a.kind === 'permission' ? (a.paid ? 'Con goce' : 'Sin goce') : null,
        status: a.status,
        start_date: a.start,
        end_date: a.end,
        days: a.days,
        reason: a.reason,
        created_at: a.createdAt,
        reviewed_at: a.reviewedAt,
        reviewed_by_name: a.reviewedBy,
        comment: a.comment,
        person: {
            full_name: a.name,
            avatar: person?.avatar ?? null,
            email: a.email,
            department: person?.department ?? null,
        },
    }
}

export function useAdminAbsences(token: string, withBalances = false) {
    const state = useAsync(async () => {
        const [vacations, permissions, people, balances] = await Promise.all([
            api<Raw[]>('/vacations/requests', {}, token),
            api<Raw[]>('/permissions/requests', {}, token),
            api<Person[]>('/people', {}, token),
            withBalances ? api<VacationBalanceRow[]>('/vacations/balances', {}, token) : Promise.resolve([]),
        ])

        return {
            absences: [
                ...vacations.map(v => normalize(v, 'vacation')),
                ...permissions.map(p => normalize(p, 'permission')),
            ],
            people: new Map(people.map(p => [p.id, p])),
            balances,
        }
    }, [token, withBalances])

    useAppEvent('requests:changed', state.reload)

    return state
}