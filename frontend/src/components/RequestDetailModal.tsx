import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { formatRange, parseServerDate, toDate, ymd } from '../lib/format'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { Avatar } from './Avatar'

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type RequestDetail = {
    kind: 'vacation' | 'permission'
    title: string
    tag?: string | null
    status: RequestStatus
    start_date: string
    end_date: string
    days?: number | null
    reason?: string | null
    created_at?: string | null
    reviewed_at?: string | null
    reviewed_by_name?: string | null
    comment?: string | null
    person?: { full_name: string; avatar?: string | null; email?: string | null; department?: string | null } | null
}

/** Lee un campo de texto aunque no esté declarado en el tipo (p. ej. el comentario del admin). */
export function pickText(obj: object, ...keys: string[]): string | null {
    for (const key of keys) {
        const value = (obj as Record<string, unknown>)[key]
        if (typeof value === 'string' && value.trim()) return value
    }
    return null
}

export function pickNumber(obj: object, ...keys: string[]): number | null {
    for (const key of keys) {
        const value = (obj as Record<string, unknown>)[key]
        if (typeof value === 'number') return value
    }
    return null
}

const STATUS: Record<RequestStatus, { label: string; icon: IconName; tone: string }> = {
    pending:   { label: 'Pendiente de aprobación', icon: 'clock', tone: 'pending' },
    approved:  { label: 'Solicitud aprobada',      icon: 'check', tone: 'approved' },
    rejected:  { label: 'Solicitud rechazada',     icon: 'x',     tone: 'rejected' },
    cancelled: { label: 'Solicitud cancelada',     icon: 'x',     tone: 'cancelled' },
}

const DAY = 86_400_000

function dateTime(value?: string | null) {
    if (!value) return null

    return parseServerDate(value).toLocaleString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function DateTile({ value, label }: { value: string; label: string }) {
    const d = toDate(value)

    return (
        <div className="rd-date">
            <span className="rd-date-label">{label}</span>
            <span className="rd-date-weekday cap">{d.toLocaleDateString('es-MX', { weekday: 'long' })}</span>
            <strong>{d.getDate()}</strong>
            <span className="rd-date-month cap">{d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</span>
        </div>
    )
}

export function RequestDetailModal({ request, onClose }: { request: RequestDetail; onClose: () => void }) {
    const closeRef = useRef<HTMLButtonElement>(null)
    const status = STATUS[request.status]
    const singleDay = request.start_date.slice(0, 10) === request.end_date.slice(0, 10)

    // Cuenta regresiva solo para solicitudes vigentes que aún no empiezan
    const today = toDate(ymd(new Date()))
    const startsIn = Math.round((toDate(request.start_date).getTime() - today.getTime()) / DAY)
    const endsIn = Math.round((toDate(request.end_date).getTime() - today.getTime()) / DAY)
    const active = request.status === 'approved' || request.status === 'pending'

    const countdown = !active
        ? null
        : startsIn > 1
          ? `Empieza en ${startsIn} días`
          : startsIn === 1
            ? 'Empieza mañana'
            : startsIn <= 0 && endsIn >= 0
              ? 'En curso'
              : null

    useEffect(() => {
        closeRef.current?.focus()

        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', onKey)

        const overflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = overflow
        }
    }, [onClose])

    const forAdmin = Boolean(request.person)

    const reviewStep =
        request.status === 'pending'
            ? {
                title: 'En revisión',
                text: forAdmin ? 'Pendiente de tu respuesta en Solicitudes.' : 'Esperando la respuesta de tu jefe o de RH.',
                tone: 'current',
            }
            : request.status === 'cancelled'
            ? { title: forAdmin ? 'El empleado la canceló' : 'Cancelaste la solicitud', text: dateTime(request.reviewed_at), tone: 'cancelled' }
            : {
                    title: `${request.status === 'approved' ? 'Aprobada' : 'Rechazada'}${request.reviewed_by_name ? ` por ${request.reviewed_by_name}` : ''}`,
                    text: dateTime(request.reviewed_at),
                    tone: request.status,
                }

        
    return createPortal(
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className={`rd-card ${status.tone}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="rd-title"
                onClick={e => e.stopPropagation()}
            >
                <header className="rd-head">
                    <span className="rd-kind-icon">
                        <Icon name={request.kind === 'vacation' ? 'sun' : 'file'} size={20} />
                    </span>

                    <div className="rd-head-text">
                        <p>{request.kind === 'vacation' ? 'Vacaciones' : 'Permiso'}</p>
                        <h2 id="rd-title">{request.title}</h2>
                    </div>

                    <button ref={closeRef} type="button" className="rd-close" aria-label="Cerrar" onClick={onClose}>
                        <Icon name="x" size={18} />
                    </button>

                    <div className="rd-status">
                        <span className="rd-status-icon">
                            <Icon name={status.icon} size={14} />
                        </span>
                        {status.label}
                    </div>
                </header>

                <div className="rd-body">
                    <section className="rd-dates rd-step">
                        {singleDay ? (
                            <DateTile value={request.start_date} label="Fecha" />
                        ) : (
                            <>
                                <DateTile value={request.start_date} label="Desde" />
                                <span className="rd-arrow" aria-hidden="true">
                                    <Icon name="right" size={18} />
                                </span>
                                <DateTile value={request.end_date} label="Hasta" />
                            </>
                        )}
                    </section>

                    <div className="rd-chips rd-step">
                        {request.days != null && (
                            <span className="rd-chip">
                                <Icon name="calendar" size={13} />
                                {request.days} {request.days === 1 ? 'día hábil' : 'días hábiles'}
                            </span>
                        )}
                        {request.tag && <span className="rd-chip">{request.tag}</span>}
                        {countdown && <span className="rd-chip highlight">{countdown}</span>}
                    </div>

                    <dl className="rd-details rd-step">
                        <div>
                            <dt>Periodo</dt>
                            <dd>{formatRange(request.start_date, request.end_date)}</dd>
                        </div>
                        <div>
                            <dt>Motivo</dt>
                            <dd>{request.reason || 'Sin motivo especificado'}</dd>
                        </div>
                        <div>
                            <dt>Autorizó</dt>
                            <dd>{request.reviewed_by_name ?? (request.status === 'pending' ? 'Pendiente' : '—')}</dd>
                        </div>
                    </dl>

                    {request.person && (
                        <div className="rd-person rd-step">
                            <Avatar user={{ full_name: request.person.full_name, avatar: request.person.avatar ?? null }}
                                size="md" 
                            />
                            <div>
                                <strong>{request.person.full_name}</strong>
                                <small>{[request.person.department, request.person.email].filter(Boolean).join(' · ') || 'Empleado'}</small>
                            </div>
                        </div>
                    )}

                    {request.comment && (
                        <blockquote className="rd-comment rd-step">
                            <Icon name="user" size={14} />
                            <div>
                                <strong>Comentario{request.reviewed_by_name ? ` de ${request.reviewed_by_name}` : ''}</strong>
                                <p>{request.comment}</p>
                            </div>
                        </blockquote>
                    )}

                    <section className="rd-step">
                        <h3 className="rd-section-title">Historial de la solicitud</h3>

                        <ol className="rd-timeline">
                            <li className="done">
                                <span className="rd-dot">
                                    <Icon name="check" size={11} />
                                </span>
                                <div>
                                    <strong>Solicitud enviada</strong>
                                    {request.created_at && <small>{dateTime(request.created_at)}</small>}
                                </div>
                            </li>

                            <li className={reviewStep.tone}>
                                <span className="rd-dot">
                                    {reviewStep.tone !== 'current' && (
                                        <Icon name={request.status === 'approved' ? 'check' : 'x'} size={11} />
                                    )}
                                </span>
                                <div>
                                    <strong>{reviewStep.title}</strong>
                                    {reviewStep.text && <small>{reviewStep.text}</small>}
                                </div>
                            </li>
                        </ol>
                    </section>
                </div>
            </div>
        </div>,
        document.body
    )
}