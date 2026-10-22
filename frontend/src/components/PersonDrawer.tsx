import { useEffect } from 'react'
import { DAY_LABELS, formatDay } from '../lib/format'
import { deptColors, seniority } from '../lib/people'
import type { Person } from '../lib/types'
import { Avatar } from './Avatar'
import { Icon } from './Icon'

function PersonLink({ person, onSelect }: { person: Person; onSelect: (p: Person) => void }) {
    return (
        <button type="button" className="drawer-person" onClick={() => onSelect(person)}>
            <Avatar user={person} size="sm" />
            <span>
                <strong>{person.full_name}</strong>
                <small>{person.position ?? 'Sin puesto asignado'}</small>
            </span>
        </button>
    )
}

export function PersonDrawer({
    person,
    people,
    isAdmin,
    onClose,
    onSelect,
    onShowInChart,
    onEdit,
}: {
    person: Person
    people: Person[]
    isAdmin: boolean
    onClose: () => void
    onSelect: (person: Person) => void
    onShowInChart: (person: Person) => void
    onEdit: (person: Person) => void
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    const manager = people.find(p => p.id === person.manager_id)
    const reports = people.filter(p => p.manager_id === person.id)
    const s = person.schedule

    return (
        <div className="drawer-backdrop" onClick={onClose}>
            <aside className="drawer" role="dialog" aria-label={`Perfil de ${person.full_name}`} onClick={e => e.stopPropagation()}>
                <button type="button" className="secondary compact drawer-close" aria-label="Cerrar" onClick={onClose}>
                    <Icon name="x" size={16} />
                </button>

                <div className="drawer-hero" key={person.id}>
                    <Avatar user={person} size="lg" />
                    <h2>{person.full_name}</h2>
                    <p className="muted">{person.position ?? 'Sin puesto asignado'}</p>
                    {person.department && (
                        <span className="dept-chip" style={deptColors(person.department)}>
                            {person.department}
                        </span>
                    )}
                </div>

                <div className="drawer-actions">
                    <button type="button" className="secondary compact" onClick={() => onShowInChart(person)}>
                        <Icon name="org" size={14} /> Ver en organigrama
                    </button>

                    {isAdmin && (
                        <button type="button" className="compact" onClick={() => onEdit(person)}>
                            <Icon name="briefcase" size={14} /> Editar perfil laboral
                        </button>
                    )}
                </div>

                <dl className="drawer-list">
                    <div>
                        <dt><Icon name="mail" size={14} /> Correo</dt>
                        <dd><a href={`mailto:${person.email}`}>{person.email}</a></dd>
                    </div>

                    {person.phone && (
                        <div>
                            <dt><Icon name="phone" size={14} /> Teléfono</dt>
                            <dd><a href={`tel:${person.phone}`}>{person.phone}</a></dd>
                        </div>
                    )}

                    {person.employee_code && (
                        <div>
                            <dt><Icon name="briefcase" size={14} /> Código</dt>
                            <dd>{person.employee_code}</dd>
                        </div>
                    )}

                    <div>
                        <dt><Icon name="calendar" size={14} /> Antigüedad</dt>
                        <dd>
                            {seniority(person.hire_date)}
                            {person.hire_date && <small className="cell-sub">Desde el {formatDay(person.hire_date)}</small>}
                        </dd>
                    </div>

                    <div>
                        <dt><Icon name="clock" size={14} /> Horario</dt>
                        <dd>
                            {s.start_time}–{s.end_time} · {s.work_days.map(d => DAY_LABELS[d]).join(' ')}
                            <small className="cell-sub">
                                {s.is_custom ? 'Horario propio' : 'Horario general'} · {s.tolerance_minutes} min de tolerancia
                            </small>
                        </dd>
                    </div>
                </dl>

                <section>
                    <h3 className="drawer-title">Jefe directo</h3>
                    {manager ? <PersonLink person={manager} onSelect={onSelect} /> : <p className="muted">{person.is_top_level ? 'Cabeza de la organización' : 'Sin jefe directo asignado'}</p>}
                </section>

                <section>
                    <h3 className="drawer-title">Equipo directo ({reports.length})</h3>

                    {reports.length ? (
                        <div className="drawer-people">
                            {reports.map(p => <PersonLink key={p.id} person={p} onSelect={onSelect} />)}
                        </div>
                    ) : (
                        <p className="muted">No tiene personas a su cargo.</p>
                    )}
                </section>
            </aside>
        </div>
    )
}