import { useState } from 'react'
import { api } from '../lib/api'
import { parseServerDate, ymd } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { AdminRecord, User } from '../lib/types'
import { useToast } from './Toast'

export type ManualMode =
    | { type: 'create'; userId?: number; date?: string; kind?: 'entry' | 'exit' }
    | { type: 'edit'; record: AdminRecord }

const localTime = (value: string) =>
    parseServerDate(value).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    })

export function ManualRecordModal({
    token,
    mode,
    onClose,
    onSaved,
}: {
    token: string
    mode: ManualMode
    onClose: () => void
    onSaved: () => void
}) {
    const toast = useToast()
    const editing = mode.type === 'edit' ? mode.record : null

    const employees = useAsync(
        () => (editing ? Promise.resolve([] as User[]) : api<User[]>('/users', {}, token)),
        [token]
    )

    const [userId, setUserId] = useState(mode.type === 'create' ? String(mode.userId ?? '') : '')
    const [date, setDate] = useState(
        editing ? editing.work_date.slice(0, 10) : mode.type === 'create' ? mode.date ?? ymd(new Date()) : ''
    )
    const [kind, setKind] = useState<'entry' | 'exit'>(
        editing ? editing.kind : mode.type === 'create' ? mode.kind ?? 'entry' : 'entry'
    )
    const [time, setTime] = useState(editing ? localTime(editing.recorded_at) : '09:00')
    const [status, setStatus] = useState<'auto' | 'normal' | 'late'>('auto')
    const [note, setNote] = useState(editing?.note ?? '')
    const [busy, setBusy] = useState(false)

    const people = (employees.data ?? []).filter(u => u.role === 'employee' && u.is_active)

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setBusy(true)

        try {
            const recordedAt = `${date}T${time}:00` // hora de la empresa

            if (editing) {
                await api(
                    `/attendance/${editing.id}`,
                    {
                        method: 'PATCH',
                        body: JSON.stringify({
                            recorded_at: recordedAt,
                            status: kind === 'entry' && status !== 'auto' ? status : null,
                            note: note.trim() || null,
                        }),
                    },
                    token
                )
            } else {
                await api(
                    '/attendance/manual',
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            user_id: Number(userId),
                            kind,
                            work_date: date,
                            recorded_at: recordedAt,
                            status: kind === 'entry' && status !== 'auto' ? status : null,
                            note: note.trim(),
                        }),
                    },
                    token
                )
            }

            toast.success(editing ? 'Registro actualizado.' : 'Registro creado.')
            onSaved()
            onClose()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo guardar el registro.')
        } finally {
            setBusy(false)
        }
    }

    const remove = async () => {
        if (!editing || !window.confirm('¿Eliminar este registro? El empleado recibirá un aviso.')) return

        setBusy(true)

        try {
            await api(`/attendance/${editing.id}`, { method: 'DELETE' }, token)
            toast.success('Registro eliminado.')
            onSaved()
            onClose()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo eliminar.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <form className="modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
                <p className="eyebrow">ASISTENCIA</p>
                <h2>{editing ? 'Corregir registro' : 'Registro manual'}</h2>

                {editing ? (
                    <p className="muted">
                        {editing.user_name} · {editing.kind === 'entry' ? 'Entrada' : 'Salida'} del{' '}
                        {editing.work_date.slice(0, 10)}
                    </p>
                ) : (
                    <>
                        <label>
                            Empleado
                            <select value={userId} onChange={e => setUserId(e.target.value)} required>
                                <option value="">{employees.data ? 'Selecciona…' : 'Cargando…'}</option>
                                {people.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.full_name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className="modal-row">
                            <label>
                                Fecha
                                <input type="date" value={date} max={ymd(new Date())} onChange={e => setDate(e.target.value)} required />
                            </label>

                            <label>
                                Tipo
                                <select value={kind} onChange={e => setKind(e.target.value as 'entry' | 'exit')}>
                                    <option value="entry">Entrada</option>
                                    <option value="exit">Salida</option>
                                </select>
                            </label>
                        </div>
                    </>
                )}

                <div className="modal-row">
                    <label>
                        Hora
                        <input type="time" value={time} onChange={e => setTime(e.target.value)} required />
                    </label>

                    {kind === 'entry' && (
                        <label>
                            Estado
                            <select value={status} onChange={e => setStatus(e.target.value as 'auto' | 'normal' | 'late')}>
                                <option value="auto">Automático (según horario)</option>
                                <option value="normal">Puntual</option>
                                <option value="late">Retardo</option>
                            </select>
                        </label>
                    )}
                </div>

                <label>
                    Motivo de la corrección
                    <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder="Ej. Olvidó registrar su salida"
                        required={!editing}
                    />
                </label>

                <div className="modal-actions">
                    {editing && (
                        <button type="button" className="danger" disabled={busy} onClick={remove}>
                            Eliminar
                        </button>
                    )}

                    <button type="button" className="secondary" onClick={onClose}>
                        Cancelar
                    </button>

                    <button type="submit" disabled={busy}>
                        {busy ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>
    )
}