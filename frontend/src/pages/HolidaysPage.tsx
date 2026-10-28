import { useState } from 'react'
import { api } from '../lib/api'
import { toDate } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { Holiday } from '../lib/types'
import { StateView } from '../components/StatusBlocks'
import { useToast } from '../components/Toast'
import { PageHeader } from '../components/PageHeader'

export function HolidaysPage({ token, onChanged }: { token: string; onChanged: () => void }) {
    const toast = useToast()
    const holidays = useAsync(() => api<Holiday[]>('/holidays', {}, token), [token])

    const [year, setYear] = useState(new Date().getFullYear())
    const [date, setDate] = useState('')
    const [name, setName] = useState('')
    const [busy, setBusy] = useState(false)

    const refresh = () => {
        holidays.reload()
        onChanged()
    }

    const fail = (error: unknown, fallback: string) =>
        toast.error(error instanceof Error ? error.message : fallback)

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

            toast.success(
                result.created ? `Se agregaron ${result.created} festivos de ley.` : 'Los festivos de ley ya estaban cargados.'
            )
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
            <PageHeader eyebrow="CALENDARIO LABORAL" title="Días festivos" description="Los festivos no cuentan como falta en asistencia ni en reportes." />

            <section className="dashboard-card history-card">
                <div className="section-title history-title">
                    <h2>Festivos de {year}</h2>

                    <div className="date-nav">
                        <button type="button" className="secondary compact" onClick={() => setYear(y => y - 1)} aria-label="Año anterior">‹</button>
                        <strong>{year}</strong>
                        <button type="button" className="secondary compact" onClick={() => setYear(y => y + 1)} aria-label="Año siguiente">›</button>
                    </div>
                </div>

                <form className="holiday-form" onSubmit={add}>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del festivo" minLength={2} maxLength={120} required />

                    <button type="submit" className="compact" disabled={busy}>Agregar</button>

                    <button type="button" className="secondary compact" disabled={busy} onClick={loadStatutory}>
                        Cargar festivos de ley {year}
                    </button>
                </form>

                <StateView state={holidays}>
                    {all => {
                        const list = all.filter(h => h.holiday_date.startsWith(String(year)))

                        return list.length === 0 ? (
                            <p className="empty">No hay festivos cargados para {year}.</p>
                        ) : (
                            <div className="table-card">
                                <div className="table-scroll">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Fecha</th>
                                                <th>Festivo</th>
                                                <th className="col-actions">Acciones</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {list.map(h => (
                                                <tr key={h.id}>
                                                    <td data-label="Fecha" className="cap">
                                                        {toDate(h.holiday_date).toLocaleDateString('es-MX', {
                                                            weekday: 'long',
                                                            day: 'numeric',
                                                            month: 'long',
                                                        })}
                                                    </td>
                                                    <td data-label="Festivo">{h.name}</td>
                                                    <td data-label="Acciones" className="col-actions">
                                                        <button type="button" className="link" onClick={() => remove(h)}>
                                                            Eliminar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    }}
                </StateView>
            </section>
        </div>
    )
}