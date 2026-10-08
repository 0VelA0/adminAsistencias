// ✅ CAMBIO 1: quitamos useEffect del import (ya no se usa)
import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import { STATUS_LABEL, countWorkdays, formatDay, formatRange } from '../lib/format'
// ✅ CAMBIO 2: nuevos imports
import { useAsync } from '../lib/useAsync'
import { StateView } from '../components/StatusBlocks'

type Status = 'pending' | 'approved' | 'rejected' | 'cancelled'

type RawBase = {
    id: number
    user_name: string
    user_email: string
    start_date: string
    end_date: string
    reason: string | null
    status: Status
    admin_note: string | null
    created_at: string
}

type RawVacation = RawBase & { days: number }
type RawPermission = RawBase & { kind: 'paid' | 'unpaid' }

type Item = {
    key: string
    source: 'vacations' | 'permissions'
    id: number
    userName: string
    userEmail: string
    title: string
    start: string
    end: string
    days: number
    reason: string | null
    status: Status
    adminNote: string | null
    createdAt: string
}

type Review = { item: Item; action: 'approve' | 'reject' }

function ReviewModal({
    token,
    review,
    onClose,
    onDone,
}: {
    token: string
    review: Review
    onClose: () => void
    onDone: () => Promise<void>
}) {
    const [note, setNote] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')

    const approve = review.action === 'approve'

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setSending(true)
        setError('')

        try {
            await api(
                `/${review.item.source}/${review.item.id}/${review.action}`,
                {
                    method: 'POST',
                    body: JSON.stringify({ admin_note: note.trim() || null }),
                },
                token
            )

            await onDone()
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo completar la acción.')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <form className="modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
                <p className="eyebrow">{review.item.title.toUpperCase()}</p>
                <h2>{approve ? 'Aprobar solicitud' : 'Rechazar solicitud'}</h2>

                <p className="muted">
                    <strong>{review.item.userName}</strong> ·{' '}
                    {formatRange(review.item.start, review.item.end)} ({review.item.days}{' '}
                    {review.item.days === 1 ? 'día' : 'días'})
                </p>

                <label>
                    Comentario {approve ? '(opcional)' : 'para el empleado'}
                    <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder={approve ? 'Opcional' : 'Ej. Fechas con alta carga de trabajo'}
                    />
                </label>

                {error && <p className="error">{error}</p>}

                <div className="modal-actions">
                    <button type="button" className="secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={sending}>
                        {sending ? 'Guardando…' : approve ? 'Aprobar' : 'Rechazar'}
                    </button>
                </div>
            </form>
        </div>
    )
}

// ✅ CAMBIO 3: quitamos la prop onPendingChange de la firma
export function AdminRequestsPanel({
    token,
}: {
    token: string
}) {
    // ✅ CAMBIO 4: reemplazamos items/error/load/useEffect por useAsync
    const state = useAsync(async () => {
        const [vacations, permissions] = await Promise.all([
            api<RawVacation[]>('/vacations/requests', {}, token),
            api<RawPermission[]>('/permissions/requests', {}, token),
        ])

        const base = (r: RawBase) => ({
            id: r.id,
            userName: r.user_name,
            userEmail: r.user_email,
            start: r.start_date,
            end: r.end_date,
            reason: r.reason,
            status: r.status,
            adminNote: r.admin_note,
            createdAt: r.created_at,
        })

        const next: Item[] = [
            ...vacations.map(v => ({
                ...base(v),
                key: `v-${v.id}`,
                source: 'vacations' as const,
                title: 'Vacaciones',
                days: v.days,
            })),
            ...permissions.map(p => ({
                ...base(p),
                key: `p-${p.id}`,
                source: 'permissions' as const,
                title: `Permiso ${p.kind === 'paid' ? 'con goce' : 'sin goce'}`,
                days: countWorkdays(p.start_date, p.end_date),
            })),
        ]

        return next
    }, [token])

    const items = state.data ?? []

    const [filter, setFilter] = useState<'pending' | 'all'>('pending')
    const [review, setReview] = useState<Review | null>(null)

    const pendingCount = items.filter(i => i.status === 'pending').length

    const rows = useMemo(() => {
        if (filter === 'pending') {
            return items
                .filter(i => i.status === 'pending')
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        }

        return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }, [items, filter])

    return (
        <section className="dashboard-card history-card">
            <div className="section-title history-title">
                <h2>Solicitudes de vacaciones y permisos</h2>
                <span>{pendingCount} pendientes</span>
            </div>

            {/* ✅ CAMBIO 5: envolvemos tabs + tabla en StateView */}
            <StateView state={state}>
                {() => (
                    <>
                        <div className="table-toolbar">
                            <div className="filter-tabs">
                                <button
                                    type="button"
                                    className={filter === 'pending' ? 'active' : ''}
                                    onClick={() => setFilter('pending')}
                                >
                                    Pendientes
                                </button>
                                <button
                                    type="button"
                                    className={filter === 'all' ? 'active' : ''}
                                    onClick={() => setFilter('all')}
                                >
                                    Todas
                                </button>
                            </div>
                        </div>

                        {/* ✅ CAMBIO 6: quitamos el {error && <p className="error">{error}</p>}
                            porque StateView ya muestra el error del fetch */}

                        {!rows.length ? (
                            <p className="empty">
                                {filter === 'pending'
                                    ? 'No hay solicitudes pendientes.'
                                    : 'Aún no hay solicitudes.'}
                            </p>
                        ) : (
                            <div className="table-card">
                                <div className="table-scroll">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Empleado</th>
                                                <th>Tipo</th>
                                                <th>Periodo</th>
                                                <th>Días</th>
                                                <th>Motivo</th>
                                                <th>Solicitada</th>
                                                <th>Estado</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {rows.map(item => (
                                                <tr key={item.key}>
                                                    <td data-label="Empleado">
                                                        <strong>{item.userName}</strong>
                                                        <small className="cell-sub">{item.userEmail}</small>
                                                    </td>
                                                    <td data-label="Tipo">{item.title}</td>
                                                    <td data-label="Periodo">
                                                        {formatRange(item.start, item.end)}
                                                    </td>
                                                    <td data-label="Días">{item.days}</td>
                                                    <td data-label="Motivo">
                                                        {item.reason ?? '—'}
                                                        {item.adminNote && (
                                                            <small className="cell-sub">
                                                                Comentario: {item.adminNote}
                                                            </small>
                                                        )}
                                                    </td>
                                                    <td data-label="Solicitada">{formatDay(item.createdAt)}</td>
                                                    <td data-label="Estado">
                                                        <span className={`badge ${item.status}`}>
                                                            {STATUS_LABEL[item.status]}
                                                        </span>
                                                    </td>
                                                    <td data-label="Acciones">
                                                        {item.status === 'pending' ? (
                                                            <div className="row-actions">
                                                                <button
                                                                    type="button"
                                                                    className="compact"
                                                                    onClick={() =>
                                                                        setReview({ item, action: 'approve' })
                                                                    }
                                                                >
                                                                    Aprobar
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="secondary compact"
                                                                    onClick={() =>
                                                                        setReview({ item, action: 'reject' })
                                                                    }
                                                                >
                                                                    Rechazar
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </StateView>

            {review && (
                <ReviewModal
                    token={token}
                    review={review}
                    onClose={() => setReview(null)}
                    // ✅ CAMBIO 7: onDone ahora usa state.reload
                    onDone={async () => { state.reload()}}
                />
            )}
        </section>
    )
}