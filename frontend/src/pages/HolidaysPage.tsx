import { useState } from 'react'
import { api } from '../lib/api'
import { toDate, ymd } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { Holiday } from '../lib/types'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { StateView } from '../components/StatusBlocks'
import { useToast } from '../components/Toast'

const DAY = 86_400_000

function daysUntil(date: string) {
    return Math.round((toDate(date).getTime() - toDate(ymd(new Date())).getTime()) / DAY)
}

export function HolidaysPage({ token, onChanged }: { token: string; onChanged: () => void }) {
    const toast = useToast()
    const holidays = useAsync(() => api<Holiday[]>('/holidays', {}, token), [token])

    const [year, setYear] = useState(new Date().getFullYear())
    const [date, setDate] = useState('')
    const [name, setName] = useState('')
    const [busy, setBusy] = useState(false)

    const today = ymd(new Date())

    const refresh = () => {
        holidays.reload()
        onChanged()
    }

    const fail = (error: unknown, fallback: string) => toast.error(error instanceof Error ? error.message : fallback)

    const add = async (event: React.FormEvent) => {
        event.preventDefault()
        setBusy(true)

        try {
            await api('/holidays', { method: 'POST', body: JSON.stringify({ holiday_date: date, name: name.trim() }) }, token)
            setDate('')
            setName('')
            toast.success('Festivo agregado.')
            refresh()
        } catch (error) {
            fail(error, 'No se pudo agregar el festivo.')
        } finally {
            setBusy(false)
        }
    }

    const loadStatutory = async () => {
        setBusy(true)

        try {
            const result = await api<{ created: number }>(`/holidays/statutory?year=${year}`, { method: 'POST' }, token)
            toast.success(result.created ? `Se agregaron ${result.created} festivos de ley.` : 'Los festivos de ley ya estaban cargados.')
            refresh()
        } catch (error) {
            fail(error, 'No se pudieron cargar los festivos.')
        } finally {
            setBusy(false)
        }
    }

    const remove = async (holiday: Holiday) => {
        if (!window.confirm(`¿Eliminar "${holiday.name}"?`)) return

        try {
            await api(`/holidays/${holiday.id}`, { method: 'DELETE' }, token)
            toast.success('Festivo eliminado.')
            refresh()
        } catch (error) {
            fail(error, 'No se pudo eliminar.')
        }
    }

    return (
        <div className="page-content">
            <PageHeader
                eyebrow="CALENDARIO LABORAL"
                title="Días festivos"
                description="Los festivos no cuentan como falta en asistencia, historial ni reportes."
                actions={
                    <>
                        <div className="year-stepper" aria-label="Año">
                            <button type="button" aria-label="Año anterior" onClick={() => setYear(y => y - 1)}>
                                <Icon name="left" size={15} />
                            </button>
                            <strong>{year}</strong>
                            <button type="button" aria-label="Año siguiente" onClick={() => setYear(y => y + 1)}>
                                <Icon name="right" size={15} />
                            </button>
                        </div>

                        <button type="button" className="secondary" disabled={busy} onClick={loadStatutory}>
                            <Icon name="download" size={16} /> Cargar festivos de ley
                        </button>
                    </>
                }
            />

            <StateView state={holidays}>
                {all => {
                    const list = all
                        .filter(h => h.holiday_date.startsWith(String(year)))
                        .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))

                    const onWorkdays = list.filter(h => {
                        const day = toDate(h.holiday_date).getDay()
                        return day !== 0 && day !== 6
                    }).length

                    const next = all
                        .filter(h => h.holiday_date.slice(0, 10) >= today)
                        .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))[0]

                    const months = new Map<number, Holiday[]>()
                    for (const h of list) {
                        const month = toDate(h.holiday_date).getMonth()
                        months.set(month, [...(months.get(month) ?? []), h])
                    }

                    return (
                        <div className="holidays-layout">
                            <div className="holidays-main">
                                <section className="holiday-stats">
                                    <article className="holiday-stat">
                                        <span className="holiday-stat-icon"><Icon name="calendar" size={18} /></span>
                                        <strong>{list.length}</strong>
                                        <span>Festivos en {year}</span>
                                    </article>

                                    <article className="holiday-stat">
                                        <span className="holiday-stat-icon ok"><Icon name="clock" size={18} /></span>
                                        <strong>{onWorkdays}</strong>
                                        <span>Caen entre semana</span>
                                    </article>

                                    <article className="holiday-stat next">
                                        <span className="holiday-stat-icon warn"><Icon name="sun" size={18} /></span>
                                        {next ? (
                                            <>
                                                <strong className="holiday-next-name">{next.name}</strong>
                                                <span className="cap">
                                                    {daysUntil(next.holiday_date) === 0
                                                        ? 'Es hoy'
                                                        : `En ${daysUntil(next.holiday_date)} días · ${toDate(next.holiday_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}`}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <strong>–</strong>
                                                <span>Sin próximos festivos</span>
                                            </>
                                        )}
                                    </article>
                                </section>

                                {list.length === 0 ? (
                                    <section className="dashboard-card empty-state">
                                        <Icon name="calendar" size={30} />
                                        <strong>No hay festivos cargados para {year}</strong>
                                        <p className="muted">Empieza con los días de descanso obligatorio de la ley y agrega los propios de tu empresa.</p>
                                        <button type="button" disabled={busy} onClick={loadStatutory}>
                                            <Icon name="download" size={16} /> Cargar festivos de ley {year}
                                        </button>
                                    </section>
                                ) : (
                                    <section className="dashboard-card holiday-card">
                                        {[...months.entries()].map(([month, items]) => (
                                            <div className="holiday-month" key={month}>
                                                <h3 className="cap">
                                                    {new Date(year, month, 1).toLocaleDateString('es-MX', { month: 'long' })}
                                                </h3>

                                                <ul className="holiday-list">
                                                    {items.map(h => {
                                                        const d = toDate(h.holiday_date)
                                                        const left = daysUntil(h.holiday_date)
                                                        const weekend = d.getDay() === 0 || d.getDay() === 6
                                                        const isNext = next?.id === h.id

                                                        return (
                                                            <li key={h.id} className={`holiday-row ${left < 0 ? 'past' : ''} ${left === 0 ? 'today' : ''}`}>
                                                                <div className="holiday-date">
                                                                    <strong>{d.getDate()}</strong>
                                                                    <span>{d.toLocaleDateString('es-MX', { month: 'short' })}</span>
                                                                </div>

                                                                <div className="holiday-info">
                                                                    <strong>{h.name}</strong>
                                                                    <span className="cap">
                                                                        {d.toLocaleDateString('es-MX', { weekday: 'long' })}
                                                                        {weekend && ' · cae en fin de semana'}
                                                                    </span>
                                                                </div>

                                                                <span className={`holiday-tag ${left === 0 ? 'today' : isNext ? 'next' : left < 0 ? 'past' : ''}`}>
                                                                    {left === 0 ? 'Hoy' : isNext ? 'Próximo' : left < 0 ? 'Pasado' : `En ${left} días`}
                                                                </span>

                                                                <button
                                                                    type="button"
                                                                    className="icon-btn danger-ghost"
                                                                    aria-label={`Eliminar ${h.name}`}
                                                                    title="Eliminar"
                                                                    onClick={() => remove(h)}
                                                                >
                                                                    <Icon name="trash" size={15} />
                                                                </button>
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            </div>
                                        ))}
                                    </section>
                                )}
                            </div>

                            <aside className="holidays-aside">
                                <form className="dashboard-card holiday-add" onSubmit={add}>
                                    <div className="holiday-add-head">
                                        <span className="holiday-stat-icon"><Icon name="plus" size={16} /></span>
                                        <div>
                                            <h2>Agregar festivo</h2>
                                            <p className="muted">Días propios de tu empresa, puentes o fechas especiales.</p>
                                        </div>
                                    </div>

                                    <label>
                                        Fecha
                                        <input
                                            type="date"
                                            value={date}
                                            min={`${year}-01-01`}
                                            max={`${year}-12-31`}
                                            onChange={e => setDate(e.target.value)}
                                            required
                                        />
                                    </label>

                                    <label>
                                        Nombre
                                        <input
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="Ej. Aniversario de la empresa"
                                            minLength={2}
                                            maxLength={120}
                                            required
                                        />
                                    </label>

                                    <button type="submit" disabled={busy}>
                                        <Icon name="plus" size={15} /> Agregar a {year}
                                    </button>
                                </form>

                                <section className="dashboard-card holiday-note">
                                    <Icon name="file" size={18} />
                                    <p>
                                        <strong>Festivos de ley.</strong> Se cargan los días de descanso obligatorio del artículo 74
                                        de la Ley Federal del Trabajo. Revísalos con tu área legal y agrega los que tu empresa
                                        otorgue adicionalmente.
                                    </p>
                                </section>
                            </aside>
                        </div>
                    )
                }}
            </StateView>
        </div>
    )
}