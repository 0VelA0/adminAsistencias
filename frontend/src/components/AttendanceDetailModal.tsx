import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { AttendanceRecord } from '../lib/types'
import type { DayRow } from '../lib/attendance'
import { ymd } from '../lib/format'
import { Icon } from './Icon'
import type { IconName } from './Icon'

const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

export function locationLabel(record?: AttendanceRecord | null) {
    if (!record) return '—'
    if (record.source === 'admin') return 'Registro manual'
    return record.location_mode === 'remote' ? 'Remoto' : 'Oficina'
}

function usesGps(record?: AttendanceRecord | null) {
    return !!record && record.source !== 'admin' && record.location_mode !== 'remote' && record.distance_meters != null
}

type Tone = 'approved' | 'pending' | 'rejected' | 'live'

function dayState(day: DayRow): { tone: Tone; label: string; icon: IconName } {
    const isToday = day.date === ymd(new Date())

    if (day.entry && !day.exit) {
        return isToday
            ? { tone: 'live', label: 'Jornada en curso', icon: 'clock' }
            : { tone: 'rejected', label: 'Sin salida registrada', icon: 'alert' }
    }

    return day.status === 'late'
        ? { tone: 'pending', label: 'Llegaste con retardo', icon: 'clock' }
        : { tone: 'approved', label: 'Llegaste a tiempo', icon: 'check' }
}

function TimeTile({ label, record, empty }: { label: string; record?: AttendanceRecord | null; empty: string }) {
    return (
        <div className={`rd-date ${record ? '' : 'missing'}`}>
            <span className="rd-date-label">{label}</span>
            <strong>{record ? formatTime(record.recorded_at) : '--:--'}</strong>
            <span className="rd-date-month">
                {!record ? empty : usesGps(record) ? `a ${Math.round(record.distance_meters)} m` : locationLabel(record)}
            </span>
        </div>
    )
}

export function AttendanceDetailModal({ day, onClose }: { day: DayRow; onClose: () => void }) {
    const closeRef = useRef<HTMLButtonElement>(null)
    const state = dayState(day)
    const first = day.entry ?? day.exit
    const date = new Date(`${day.date}T00:00:00`)
    const notes = [day.entry?.note, day.exit?.note].filter(Boolean) as string[]

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

    const step = (record: AttendanceRecord) => (
        <li key={record.id} className="done">
            <span className="rd-dot">
                <Icon name="check" size={11} />
            </span>
            <div>
                <strong>
                    {record.kind === 'entry' ? 'Entrada' : 'Salida'} a las {formatTime(record.recorded_at)}
                </strong>
                <small>
                    {usesGps(record)
                        ? `A ${Math.round(record.distance_meters)} m de la oficina · precisión ${Math.round(record.accuracy_meters)} m`
                        : locationLabel(record)}
                </small>
                {record.note && <small className="rd-note">“{record.note}”</small>}
            </div>
        </li>
    )

    return createPortal(
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className={`rd-card ${state.tone}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="ad-title"
                onClick={e => e.stopPropagation()}
            >
                <header className="rd-head">
                    <span className="rd-kind-icon">
                        <Icon name="clock" size={20} />
                    </span>

                    <div className="rd-head-text">
                        <p className="cap">{date.toLocaleDateString('es-MX', { weekday: 'long' })}</p>
                        <h2 id="ad-title">
                            {date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </h2>
                    </div>

                    <button ref={closeRef} type="button" className="rd-close" aria-label="Cerrar" onClick={onClose}>
                        <Icon name="x" size={18} />
                    </button>

                    <div className="rd-status">
                        <span className="rd-status-icon">
                            <Icon name={state.icon} size={14} />
                        </span>
                        {state.label}
                    </div>
                </header>

                <div className="rd-body">
                    <section className="rd-dates rd-step">
                        <TimeTile label="Entrada" record={day.entry} empty="Sin registro" />
                        <span className="rd-arrow" aria-hidden="true">
                            <Icon name="right" size={18} />
                        </span>
                        <TimeTile
                            label="Salida"
                            record={day.exit}
                            empty={state.tone === 'live' ? 'En curso' : 'Sin registro'}
                        />
                    </section>

                    <div className="rd-chips rd-step">
                        <span className="rd-chip">
                            <Icon name="clock" size={13} />
                            {day.hours} trabajadas
                        </span>
                        <span className="rd-chip">
                            <Icon name={first?.location_mode === 'remote' ? 'home' : 'building'} size={13} />
                            {locationLabel(first)}
                        </span>
                    </div>

                    <dl className="rd-details rd-step">
                        <div>
                            <dt>Fecha</dt>
                            <dd className="cap">{date.toLocaleDateString('es-MX', { dateStyle: 'full' })}</dd>
                        </div>
                        <div>
                            <dt>Ubicación</dt>
                            <dd>{locationLabel(first)}</dd>
                        </div>
                        <div>
                            <dt>Estado</dt>
                            <dd>{state.label}</dd>
                        </div>
                    </dl>

                    {notes.length > 0 && (
                        <blockquote className="rd-comment rd-step">
                            <Icon name="file" size={14} />
                            <div>
                                <strong>{notes.length === 1 ? 'Nota' : 'Notas'}</strong>
                                {notes.map((note, i) => (
                                    <p key={i}>{note}</p>
                                ))}
                            </div>
                        </blockquote>
                    )}

                    <section className="rd-step">
                        <h3 className="rd-section-title">Registros del día</h3>

                        <ol className="rd-timeline">
                            {day.entry && step(day.entry)}

                            {day.exit ? (
                                step(day.exit)
                            ) : (
                                <li className={state.tone === 'live' ? 'current' : 'rejected'}>
                                    <span className="rd-dot">{state.tone !== 'live' && <Icon name="x" size={11} />}</span>
                                    <div>
                                        <strong>{state.tone === 'live' ? 'Trabajando' : 'Salida sin registrar'}</strong>
                                        <small>
                                            {state.tone === 'live'
                                                ? 'Registra tu salida al terminar tu jornada.'
                                                : 'Pide a RH que corrija este registro.'}
                                        </small>
                                    </div>
                                </li>
                            )}
                        </ol>
                    </section>
                </div>
            </div>
        </div>,
        document.body
    )
}