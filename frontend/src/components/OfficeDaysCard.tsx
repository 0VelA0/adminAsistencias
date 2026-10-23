import { useState } from 'react'
import { api } from '../lib/api'
import { toDate } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { OfficeDay } from '../lib/types'
import { Icon } from './Icon'
import { StateView } from './StatusBlocks'
import { useToast } from './Toast'

export function OfficeDaysCard({ token, onChanged }: { token: string; onChanged: () => void }) {
    const toast = useToast()
    const days = useAsync(() => api<OfficeDay[]>('/office-days/mine?days=21', {}, token), [token])

    const [editing, setEditing] = useState<OfficeDay | null>(null)
    const [reason, setReason] = useState('')
    const [busy, setBusy] = useState(false)
    const [override, setOverride] = useState<OfficeDay[] | null>(null)

    const list = override ?? days.data

    const save = async (kind: 'add' | 'remove' | 'clear') => {
        if (!editing) return
        setBusy(true)

        try {
            const updated = await api<OfficeDay[]>(
                '/office-days/mine',
                { method: 'POST', body: JSON.stringify({ change_date: editing.day, kind, reason: reason.trim() || null }) },
                token
            )

            setOverride(updated)
            setEditing(null)
            setReason('')
            onChanged()
            toast.success(kind === 'clear' ? 'Volviste a tu día habitual.' : 'Cambio registrado. Avisamos a tu jefe directo.')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo guardar el cambio.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="dashboard-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">MODALIDAD HÍBRIDA</p>
                    <h2>Mis días en oficina</h2>
                </div>
                <span className="dashboard-card-icon"><Icon name="building" /></span>
            </div>

            <StateView state={{ ...days, data: list ?? null }}>
                {items => (
                    <div className="office-strip">
                        {items
                            .filter(d => d.is_workday)
                            .map((d, i) => {
                                const date = toDate(d.day)

                                return (
                                    <button
                                        key={d.day}
                                        type="button"
                                        disabled={Boolean(d.holiday)}
                                        className={`office-day ${d.holiday ? 'holiday' : d.office ? 'office' : 'remote'} ${d.change ? 'changed' : ''}`}
                                        style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                                        title={d.holiday ?? d.reason ?? undefined}
                                        onClick={() => setEditing(d)}
                                    >
                                        <span className="cap">{date.toLocaleDateString('es-MX', { weekday: 'short' })}</span>
                                        <strong>{date.getDate()}</strong>
                                        <small>{d.holiday ? 'Festivo' : d.office ? 'Oficina' : 'Remoto'}</small>
                                    </button>
                                )
                            })}
                    </div>
                )}
            </StateView>

            <p className="office-legend muted">
                <i className="office" /> Oficina <i className="remote" /> Remoto <i className="changed" /> Cambio registrado
            </p>

            {editing && (
                <div className="modal-backdrop" onClick={() => setEditing(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <p className="eyebrow">DÍAS EN OFICINA</p>
                        <h2 className="cap">
                            {toDate(editing.day).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h2>

                        <p className="muted">
                            {editing.change
                                ? `Este día lo cambiaste a ${editing.office ? 'oficina' : 'remoto'}.`
                                : `Este día te toca ${editing.office ? 'ir a la oficina' : 'trabajar remoto'}.`}
                        </p>

                        {!editing.change && (
                            <label>
                                Motivo (lo verá tu jefe directo)
                                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} maxLength={300} />
                            </label>
                        )}

                        <div className="modal-actions">
                            <button type="button" className="secondary" onClick={() => setEditing(null)}>
                                Cancelar
                            </button>

                            {editing.change ? (
                                <button type="button" disabled={busy} onClick={() => save('clear')}>
                                    Volver a lo habitual
                                </button>
                            ) : editing.office ? (
                                <button type="button" disabled={busy} onClick={() => save('remove')}>
                                    Trabajaré remoto este día
                                </button>
                            ) : (
                                <button type="button" disabled={busy} onClick={() => save('add')}>
                                    Iré a la oficina este día
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}