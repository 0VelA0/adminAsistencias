import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import { DAY_LABELS } from '../lib/format'
import { uniqueSorted } from '../lib/people'
import { useAsync } from '../lib/useAsync'
import type { Person, WorkMode } from '../lib/types'
import { MODE_LABEL } from '../lib/types'
import { ErrorBlock, LoadingBlock } from './StatusBlocks'
import { useToast } from './Toast'
import {Icon} from './Icon'

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
    const s = person.schedule

    const [mode, setMode] = useState<WorkMode>(s.work_mode)
    const [kind, setKind] = useState<'general' | 'fixed' | 'flexible'>(
        s.schedule_type === 'flexible' ? 'flexible' : s.is_custom ? 'fixed' : 'general'
    )
    const [start, setStart] = useState(s.start_time)
    const [end, setEnd] = useState(s.end_time)
    const [tolerance, setTolerance] = useState(String(s.tolerance_minutes))
    const [days, setDays] = useState<number[]>(s.work_days)
    const [weeklyHours, setWeeklyHours] = useState(String(Math.round(s.weekly_minutes / 6) / 10))
    const [officeDays, setOfficeDays] = useState<number[]>(s.office_days)

    const effectiveDays = kind === 'general' ? [0, 1, 2, 3, 4] : days

    const toggle = (list: number[], day: number) =>
        list.includes(day) ? list.filter(d => d !== day) : [...list, day].sort()

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
                        work_mode: mode,
                        schedule_type: kind === 'flexible' ? 'flexible' : 'fixed',
                        custom_schedule: kind === 'fixed',
                        start_time: kind === 'fixed' ? start : null,
                        end_time: kind === 'fixed' ? end : null,
                        tolerance_minutes: kind === 'fixed' ? Number(tolerance) : null,
                        work_days: kind === 'general' ? null : days,
                        weekly_hours: kind === 'flexible' ? Number(weeklyHours) : null,
                        office_days: mode === 'hybrid' ? officeDays.filter(d => effectiveDays.includes(d)) : null,
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
                <h3>Modalidad de trabajo</h3>

                <div className="segmented">
                    {(Object.keys(MODE_LABEL) as WorkMode[]).map(m => (
                        <button key={m} type="button" className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
                            <Icon name={m === 'onsite' ? 'building' : m === 'remote' ? 'home' : 'switch'} size={14} /> {MODE_LABEL[m]}
                        </button>
                    ))}
                </div>

                <p className="muted form-hint">
                    {mode === 'onsite' && 'Registra siempre desde la oficina, con validación de ubicación.'}
                    {mode === 'remote' && 'Registra desde donde esté. No se pide ubicación.'}
                    {mode === 'hybrid' && 'En sus días de oficina se valida la ubicación; el resto registra como remoto.'}
                </p>

                {mode === 'hybrid' && (
                    <div className="field-group step-panel">
                        <span className="field-label">Días de oficina</span>

                        <div className="day-picker">
                            {DAY_LABELS.map((label, day) => (
                                <button
                                    key={day}
                                    type="button"
                                    disabled={!effectiveDays.includes(day)}
                                    className={officeDays.includes(day) ? '' : 'secondary'}
                                    onClick={() => setOfficeDays(current => toggle(current, day))}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            <section className="form-section">
                <h3>Jornada</h3>

                <div className="segmented">
                    <button type="button" className={kind === 'general' ? 'active' : ''} onClick={() => setKind('general')}>Horario general</button>
                    <button type="button" className={kind === 'fixed' ? 'active' : ''} onClick={() => setKind('fixed')}>Horario propio</button>
                    <button type="button" className={kind === 'flexible' ? 'active' : ''} onClick={() => setKind('flexible')}>Flexible por horas</button>
                </div>

                {kind === 'fixed' && (
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
                    </div>
                )}

                {kind === 'flexible' && (
                    <div className="step-panel">
                        <label>
                            Horas por semana
                            <input type="number" min={1} max={80} step={0.5} value={weeklyHours} onChange={e => setWeeklyHours(e.target.value)} required />
                        </label>

                        <p className="muted form-hint">
                            Sin hora de entrada ni retardos. El cumplimiento se mide por semana y se ajusta con festivos,
                            vacaciones y permisos.
                        </p>
                    </div>
                )}

                {kind !== 'general' && (
                    <div className="field-group">
                        <span className="field-label">Días laborables</span>

                        <div className="day-picker">
                            {DAY_LABELS.map((label, day) => (
                                <button key={day} type="button" className={days.includes(day) ? '' : 'secondary'} onClick={() => setDays(current => toggle(current, day))}>
                                    {label}
                                </button>
                            ))}
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