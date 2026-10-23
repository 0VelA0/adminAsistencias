import { useEffect, useState } from 'react'
import { formatMinutes, parseServerDate } from '../lib/format'
import { MODE_LABEL } from '../lib/types'
import type { AttendanceToday } from '../lib/types'
import { Icon } from './Icon'

const RADIUS = 46
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Minutos netos calculados en el navegador, para que el contador avance en vivo. */
function liveMinutes(today: AttendanceToday, now: number) {
    if (!today.entry) return 0

    const start = parseServerDate(today.entry.recorded_at).getTime()
    const end = today.exit ? parseServerDate(today.exit.recorded_at).getTime() : now

    const paused = today.breaks.reduce((total, b) => {
        const breakEnd = b.ended_at ? parseServerDate(b.ended_at).getTime() : end
        return total + Math.max(0, Math.min(breakEnd, end) - parseServerDate(b.started_at).getTime())
    }, 0)

    return Math.max(0, Math.floor((end - start - paused) / 60000))
}

const hhmm = (value: string) =>
    parseServerDate(value).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

export function AttendanceCard({
    today,
    working,
    isStation,
    onRegisterEntry,
    onRegisterExit,
    onStartBreak,
    onEndBreak,
}: {
    today: AttendanceToday
    working: boolean
    isStation: boolean
    onRegisterEntry: () => void
    onRegisterExit: () => void
    onStartBreak: () => void
    onEndBreak: () => void
}) {
    const running = Boolean(today.entry && !today.exit)
    const [now, setNow] = useState(Date.now())

    useEffect(() => {
        if (!running) return

        const id = setInterval(() => setNow(Date.now()), 15_000)
        return () => clearInterval(id)
    }, [running])

    const flexible = today.schedule_type === 'flexible'
    const worked = liveMinutes(today, now)
    const progress = today.expected_minutes ? Math.min(1, worked / today.expected_minutes) : 0
    const weekWorked = today.week_worked_minutes - today.worked_minutes + worked
    const weekProgress = today.week_target_minutes ? Math.min(1, weekWorked / today.week_target_minutes) : 0

    const state = !today.entry
        ? { label: 'Sin iniciar', tone: 'idle' }
        : today.exit
          ? { label: `Terminada a las ${hhmm(today.exit.recorded_at)}`, tone: 'done' }
          : today.on_break
            ? { label: 'En pausa', tone: 'paused' }
            : { label: 'Trabajando', tone: 'active' }

    const modeLabel =
        today.work_mode === 'hybrid'
            ? `Híbrido · ${today.is_office_day ? 'oficina hoy' : 'remoto hoy'}`
            : MODE_LABEL[today.work_mode]

    if (today.is_on_vacation) {
        return (
            <article className="dashboard-card attendance-card">
                <div className="dashboard-card-title">
                    <div>
                        <p className="eyebrow">ASISTENCIA</p>
                        <h2>Mi jornada de hoy</h2>
                    </div>
                    <span className="dashboard-card-icon"><Icon name="clock" /></span>
                </div>

                <div className="attendance-vacation">
                    <strong><Icon name="sun" size={14} /> Día de vacaciones</strong>
                    <p>Tienes vacaciones aprobadas para hoy. ¡Disfrútalas!</p>
                </div>
            </article>
        )
    }

    return (
        <article className="dashboard-card attendance-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">ASISTENCIA</p>
                    <h2>Mi jornada de hoy</h2>
                </div>

                <span className={`mode-chip ${today.is_office_day ? 'office' : 'remote'}`}>
                    <Icon name={today.is_office_day ? 'building' : 'home'} size={12} />
                    {modeLabel}
                </span>
            </div>

            <div className="workday">
                <div className={`workday-ring ${state.tone}`}>
                    <svg viewBox="0 0 110 110" aria-hidden="true">
                        <circle className="ring-track" cx="55" cy="55" r={RADIUS} />
                        <circle
                            className="ring-value"
                            cx="55"
                            cy="55"
                            r={RADIUS}
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                        />
                    </svg>

                    <div className="ring-label">
                        <strong>{formatMinutes(worked)}</strong>
                        <span>de {formatMinutes(today.expected_minutes)}</span>
                    </div>
                </div>

                <div className="workday-info">
                    <span className={`workday-state ${state.tone}`}>
                        <i /> {state.label}
                    </span>

                    <small>
                        {flexible
                            ? `Jornada flexible · guía de ${formatMinutes(today.expected_minutes)} al día`
                            : `Horario ${today.start_time}–${today.end_time}`}
                    </small>

                    {today.entry && <small>Inicio: {hhmm(today.entry.recorded_at)}</small>}

                    {today.breaks.length > 0 && (
                        <small>
                            {today.breaks.length} {today.breaks.length === 1 ? 'pausa' : 'pausas'}
                        </small>
                    )}
                </div>
            </div>

            {flexible && today.week_target_minutes > 0 && (
                <div className="week-progress">
                    <div>
                        <span>Esta semana</span>
                        <strong>
                            {formatMinutes(weekWorked)} / {formatMinutes(today.week_target_minutes)}
                        </strong>
                    </div>
                    <div className="week-bar">
                        <span style={{ transform: `scaleX(${weekProgress})` }} />
                    </div>
                </div>
            )}

            <div className="workday-actions">
                {!today.entry && (
                    <button type="button" disabled={working} onClick={onRegisterEntry}>
                        <Icon name="login" size={16} /> {working ? 'Registrando…' : 'Iniciar jornada'}
                    </button>
                )}

                {running && (
                    <>
                        {today.on_break ? (
                            <button type="button" disabled={working} onClick={onEndBreak}>
                                <Icon name="clock" size={16} /> Reanudar
                            </button>
                        ) : (
                            <button type="button" className="secondary" disabled={working} onClick={onStartBreak}>
                                <Icon name="clock" size={16} /> Pausa
                            </button>
                        )}

                        <button type="button" className="secondary" disabled={working} onClick={onRegisterExit}>
                            <Icon name="logout" size={16} /> Terminar jornada
                        </button>
                    </>
                )}
            </div>

            <div className="attendance-footer">
                <Icon name={today.requires_location ? 'pin' : 'home'} size={13} />
                <span>
                    {isStation
                        ? 'Registro por QR de recepción'
                        : today.requires_location
                          ? today.entry
                              ? 'Ubicación verificada en la oficina'
                              : 'Se validará tu ubicación en la oficina'
                          : 'Registro remoto: no se pide tu ubicación'}
                </span>
            </div>
        </article>
    )
}