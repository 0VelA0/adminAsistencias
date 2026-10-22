import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import { DAY_LABELS } from '../lib/format'
import { uniqueSorted } from '../lib/people'
import { useAsync } from '../lib/useAsync'
import type { Person } from '../lib/types'
import { ErrorBlock, LoadingBlock } from './StatusBlocks'
import { useToast } from './Toast'

type Props = { token: string; userId: number; onClose: () => void; onSaved: () => void }

export function PersonProfileModal({ token, userId, onClose, onSaved }: Props) {
    const people = useAsync(() => api<Person[]>('/people?include_inactive=true', {}, token), [token])
    const person = people.data?.find(p => p.id === userId)

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                {people.error ? (
                    <ErrorBlock message={people.error} onRetry={people.reload} />
                ) : person && people.data ? (
                    <ProfileForm token={token} person={person} people={people.data} onClose={onClose} onSaved={onSaved} />
                ) : (
                    <LoadingBlock text="Cargando perfil…" />
                )}
            </div>
        </div>
    )
}

function ProfileForm({
    token,
    person,
    people,
    onClose,
    onSaved,
}: {
    token: string
    person: Person
    people: Person[]
    onClose: () => void
    onSaved: () => void
}) {
    const toast = useToast()

    const [code, setCode] = useState(person.employee_code ?? '')
    const [position, setPosition] = useState(person.position ?? '')
    const [department, setDepartment] = useState(person.department ?? '')
    const [hireDate, setHireDate] = useState(person.hire_date ?? '')
    const [custom, setCustom] = useState(person.schedule.is_custom)
    const [start, setStart] = useState(person.schedule.start_time)
    const [end, setEnd] = useState(person.schedule.end_time)
    const [tolerance, setTolerance] = useState(String(person.schedule.tolerance_minutes))
    const [days, setDays] = useState<number[]>(person.schedule.work_days)
    const [saving, setSaving] = useState(false)
    const [managerId, setManagerId] = useState(
        person.is_top_level ? 'top' : person.manager_id ? String(person.manager_id) : ''
    )

    // La persona y todo su equipo (directo o indirecto) no pueden ser su jefe
    const blocked = useMemo(() => {
        const result = new Set<number>([person.id])
        let grew = true

        while (grew) {
            grew = false

            for (const p of people) {
                if (p.manager_id && result.has(p.manager_id) && !result.has(p.id)) {
                    result.add(p.id)
                    grew = true
                }
            }
        }

        return result
    }, [people, person.id])

    const managers = people.filter(p => p.is_active && !blocked.has(p.id))
    const positions = uniqueSorted(people.map(p => p.position))
    const departments = uniqueSorted(people.map(p => p.department))

    const toggleDay = (day: number) =>
        setDays(current => (current.includes(day) ? current.filter(d => d !== day) : [...current, day].sort()))

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setSaving(true)

        try {
            await api(
                `/people/${person.id}/profile`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        employee_code: code.trim() || null,
                        position: position.trim() || null,
                        department: department.trim() || null,
                        hire_date: hireDate || null,
                        custom_schedule: custom,
                        start_time: custom ? start : null,
                        end_time: custom ? end : null,
                        tolerance_minutes: custom ? Number(tolerance) : null,
                        work_days: custom ? days : null,
                        manager_id: managerId && managerId !== 'top' ? Number(managerId) : null,
                        is_top_level: managerId === 'top',
                    }),
                },
                token
            )

            toast.success('Perfil laboral actualizado.')
            onSaved()
            onClose()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo guardar el perfil.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <form className="modal-form" onSubmit={submit}>
            <p className="eyebrow">PERFIL LABORAL</p>
            <h2>{person.full_name}</h2>

            <div className="modal-row">
                <label>
                    Código de empleado
                    <input value={code} onChange={e => setCode(e.target.value)} placeholder="El mismo de nómina" maxLength={30} />
                </label>

                <label>
                    Fecha de ingreso
                    <input type="date" value={hireDate} onChange={e => setHireDate(e.target.value)} />
                </label>
            </div>

            <div className="modal-row">
                <label>
                    Puesto
                    <input list="positions" value={position} onChange={e => setPosition(e.target.value)} maxLength={100} />
                    <datalist id="positions">{positions.map(p => <option key={p} value={p} />)}</datalist>
                </label>

                <label>
                    Departamento
                    <input list="departments" value={department} onChange={e => setDepartment(e.target.value)} maxLength={100} />
                    <datalist id="departments">{departments.map(d => <option key={d} value={d} />)}</datalist>
                </label>
            </div>

            <label>
                Jefe directo
                <select value={managerId} onChange={e => setManagerId(e.target.value)}>
                    <option value="">Sin asignar todavía</option>
                    <option value="top">Ninguno: es cabeza de la organización</option>
                    {managers.map(m => (
                        <option key={m.id} value={m.id}>
                            {m.full_name}
                            {m.position ? ` · ${m.position}` : ''}
                        </option>
                    ))}
                </select>
            </label>

            <section className="form-section">
                <h3>Horario</h3>

                <div className="segmented">
                    <button type="button" className={!custom ? 'active' : ''} onClick={() => setCustom(false)}>
                        Horario general
                    </button>
                    <button type="button" className={custom ? 'active' : ''} onClick={() => setCustom(true)}>
                        Horario propio
                    </button>
                </div>

                {custom && (
                    <div className="step-panel">
                        <div className="modal-row">
                            <label>
                                Entrada
                                <input type="time" value={start} onChange={e => setStart(e.target.value)} required />
                            </label>

                            <label>
                                Salida
                                <input type="time" value={end} onChange={e => setEnd(e.target.value)} required />
                            </label>
                        </div>

                        <label>
                            Tolerancia (minutos)
                            <input type="number" min={0} max={180} value={tolerance} onChange={e => setTolerance(e.target.value)} required />
                        </label>

                        <div className="field-group">
                            <span className="field-label">Días laborables</span>

                            <div className="day-picker">
                                {DAY_LABELS.map((label, day) => (
                                    <button
                                        key={day}
                                        type="button"
                                        className={days.includes(day) ? '' : 'secondary'}
                                        onClick={() => toggleDay(day)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <div className="modal-actions">
                <button type="button" className="secondary" onClick={onClose}>
                    Cancelar
                </button>
                <button type="submit" disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar perfil'}
                </button>
            </div>
        </form>
    )
}