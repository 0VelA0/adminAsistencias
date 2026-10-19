import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import { deptColors, seniority, uniqueSorted } from '../lib/people'
import { useAsync } from '../lib/useAsync'
import type { Person, User } from '../lib/types'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { OrgChart } from '../components/OrgChart'
import { PersonDrawer } from '../components/PersonDrawer'
import { PersonProfileModal } from '../components/PersonProfileModal'
import { StateView } from '../components/StatusBlocks'

function Directory({ people, onSelect }: { people: Person[]; onSelect: (p: Person) => void }) {
    const [query, setQuery] = useState('')
    const [department, setDepartment] = useState('')

    const departments = useMemo(() => uniqueSorted(people.map(p => p.department)), [people])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()

        return people.filter(
            p =>
                (!department || p.department === department) &&
                (!q || `${p.full_name} ${p.position ?? ''} ${p.email}`.toLowerCase().includes(q))
        )
    }, [people, query, department])

    return (
        <>
            <div className="table-toolbar">
                <select value={department} onChange={e => setDepartment(e.target.value)} aria-label="Filtrar por área">
                    <option value="">Todas las áreas</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                <input
                    type="search"
                    placeholder="Buscar por nombre, puesto o correo…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
            </div>

            {filtered.length === 0 ? (
                <p className="empty">Nadie coincide con la búsqueda.</p>
            ) : (
                <div className="people-grid">
                    {filtered.map((p, i) => (
                        <button
                            type="button"
                            key={p.id}
                            className="person-card"
                            style={{ animationDelay: `${Math.min(i, 15) * 25}ms` }}
                            onClick={() => onSelect(p)}
                        >
                            <Avatar user={p} size="lg" />
                            <strong>{p.full_name}</strong>
                            <span className="muted">{p.position ?? 'Sin puesto asignado'}</span>
                            {p.department && <span className="dept-chip" style={deptColors(p.department)}>{p.department}</span>}
                            <small>{seniority(p.hire_date)}</small>
                        </button>
                    ))}
                </div>
            )}
        </>
    )
}

export function TeamPage({ token, user }: { token: string; user: User }) {
    const people = useAsync(() => api<Person[]>('/people', {}, token), [token])
    const isAdmin = user.role === 'admin'

    const [tab, setTab] = useState<'org' | 'directory'>('org')
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [focus, setFocus] = useState<{ id: number; key: number } | null>(null)
    const [editing, setEditing] = useState<number | null>(null)

    const selected = people.data?.find(p => p.id === selectedId) ?? null

    return (
        <div className="page-content">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">EQUIPO</p>
                    <h2>Nuestro equipo</h2>
                    <p className="muted">Conoce las personas que hacen posible el funcionamiento de la empresa.</p>
                </div>

                <div className="filter-tabs" role="tablist">
                    <button type="button" role="tab" aria-selected={tab === 'org'} className={tab === 'org' ? 'active' : ''} onClick={() => setTab('org')}>
                        <Icon name="org" size={14} /> Organigrama
                    </button>
                    <button type="button" role="tab" aria-selected={tab === 'directory'} className={tab === 'directory' ? 'active' : ''} onClick={() => setTab('directory')}>
                        <Icon name="users" size={14} /> Directorio
                    </button>
                </div>
            </div>

            <section className="dashboard-card">
                <StateView state={people}>
                    {list => {
                        const unassigned = list.filter(p => !p.manager_id).length

                        return (
                            <>
                                {isAdmin && unassigned > 1 && (
                                    <p className="notice org-hint">
                                        {unassigned} personas no tienen jefe directo y aparecen como cabeza de su propio
                                        grupo. Asígnalo desde la ficha de cada persona o en Usuarios.
                                    </p>
                                )}

                                {tab === 'org' ? (
                                    <OrgChart people={list} focus={focus} onSelect={p => setSelectedId(p.id)} />
                                ) : (
                                    <Directory people={list} onSelect={p => setSelectedId(p.id)} />
                                )}
                            </>
                        )
                    }}
                </StateView>
            </section>

            {selected && (
                <PersonDrawer
                    person={selected}
                    people={people.data ?? []}
                    isAdmin={isAdmin}
                    onClose={() => setSelectedId(null)}
                    onSelect={p => setSelectedId(p.id)}
                    onShowInChart={p => {
                        setSelectedId(null)
                        setTab('org')
                        setFocus({ id: p.id, key: Date.now() })
                    }}
                    onEdit={p => setEditing(p.id)}
                />
            )}

            {editing !== null && (
                <PersonProfileModal
                    token={token}
                    userId={editing}
                    onClose={() => setEditing(null)}
                    onSaved={people.reload}
                />
            )}
        </div>
    )
}