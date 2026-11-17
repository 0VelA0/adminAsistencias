import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { HistoryRow } from '../lib/history'
import { DateTile } from './RequestDetailModal'
import { Icon } from './Icon'
import type { IconName } from './Icon'

type Tone = 'approved' | 'pending' | 'rejected' | 'cancelled'

/** Traduce la clase del badge de la fila al color de la carta. */
export function toneOf(badge: string): Tone {
    if (['late', 'pending'].includes(badge)) return 'pending'
    if (['rejected', 'exit', 'absent', 'missing'].includes(badge)) return 'rejected'
    if (badge === 'cancelled') return 'cancelled'
    return 'approved'
}

const TONE_ICON: Record<Tone, IconName> = {
    approved: 'check',
    pending: 'clock',
    rejected: 'x',
    cancelled: 'x',
}

export function HistoryDetailModal({ row, onClose }: { row: HistoryRow; onClose: () => void }) {
    const closeRef = useRef<HTMLButtonElement>(null)
    const tone = toneOf(row.badge)
    const date = new Date(`${row.sortKey.slice(0, 10)}T00:00:00`)

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

    return createPortal(
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className={`rd-card ${tone}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="hd-title"
                onClick={e => e.stopPropagation()}
            >
                <header className="rd-head">
                    <span className="rd-kind-icon rd-kind-emoji" aria-hidden="true">
                        {row.icon}
                    </span>

                    <div className="rd-head-text">
                        <p className="cap">
                            {date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <h2 id="hd-title">{row.title}</h2>
                    </div>

                    <button ref={closeRef} type="button" className="rd-close" aria-label="Cerrar" onClick={onClose}>
                        <Icon name="x" size={18} />
                    </button>

                    <div className="rd-status">
                        <span className="rd-status-icon">
                            <Icon name={TONE_ICON[tone]} size={14} />
                        </span>
                        {row.label}
                    </div>
                </header>

                <div className="rd-body">
                    <section className="rd-dates rd-step">
                        <DateTile value={row.sortKey.slice(0, 10)} label="Fecha" />

                        <div className="rd-date">
                            <span className="rd-date-label">Horas / Días</span>
                            <strong className="rd-amount">{row.amount || '—'}</strong>
                            <span className="rd-date-month">{row.title}</span>
                        </div>
                    </section>

                    <dl className="rd-details rd-step">
                        <div>
                            <dt>Tipo</dt>
                            <dd>{row.title}</dd>
                        </div>
                        <div>
                            <dt>Detalle</dt>
                            <dd>{row.detail || '—'}</dd>
                        </div>
                        <div>
                            <dt>Estado</dt>
                            <dd>{row.label}</dd>
                        </div>
                    </dl>

                    <section className="rd-step">
                        <h3 className="rd-section-title">Información del registro</h3>

                        {row.lines.length ? (
                            <ol className="rd-timeline">
                                {row.lines.map((line, i) => (
                                    <li key={i} className="done">
                                        <span className="rd-dot">
                                            <Icon name="check" size={11} />
                                        </span>
                                        <div>
                                            <strong className="rd-line-text">{line}</strong>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="pending-request-empty">Sin información adicional.</p>
                        )}
                    </section>
                </div>
            </div>
        </div>,
        document.body
    )
}