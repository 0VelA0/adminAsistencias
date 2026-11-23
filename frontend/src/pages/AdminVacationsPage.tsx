import { useState } from 'react'
import { addDaysYmd, daysBetween, isActiveOn, kindLabel, toRequestDetail, useAdminAbsences } from '../lib/absences'
import type { Absence } from '../lib/absences'
import { toDate, ymd } from '../lib/format'
import { seniority } from '../lib/people'
import type { Person } from '../lib/types'
import { AbsenceTimeline } from '../components/AbsenceTimeline'
import { AdminVacationModal } from '../components/AdminVacationModal'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { KpiTile } from '../components/KpiTile'
import { PageHeader } from '../components/PageHeader'
import { RequestDetailModal } from '../components/RequestDetailModal'
import { StateView } from '../components/StatusBlocks'

const SPAN = 42 // 6 semanas
const short = (d: string) => toDate(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

function AbsenceItem({
    a,
    person,
    meta,
    onOpen,
}: {
    a: Absence
    person?: Person
    meta: string
    onOpen: (a: Absence) => void
}) {
    return (
        <li>
            <button type="button" className="abs-item" onClick={() => onOpen(a)}>
                <Avatar user={{ full_name: a.name, avatar: person?.avatar ?? null }} size="sm" />
                <span className="person-text">
                    <strong>{a.name}</strong>
                    <span>
                        <i className={`abs-kind ${a.kind}`} /> {kindLabel(a)} · {a.days} {a.days === 1 ? 'día' : 'días'}
                    </span>
                </span>
                <span className="abs-when">{meta}</span>
            </button>
        </li>
    )
}

export function AdminVacationsPage({ token }: { token: string }) {
    const state = useAdminAbsences(token, true)
    const today = ymd(new Date())
    const year = new Date().getFullYear()
    const daysLeft = daysBetween(today, `${year}-12-31`)

    const [from, setFrom] = useState(today)
    const [query, setQuery] = useState('')
    const [dept, setDept] = useState('')
    const [sort, setSort] = useState<'available' | 'used' | 'name'>('available')
    const [selected, setSelected] = useState<Absence | null>(null)
    const [register, setRegister] = useState<{ userId?: number } | null>(null)

    return (
        <div className="page-content">
            <PageHeader
                eyebrow="GESTIÓN"
                title="Vacaciones del equipo"
                description="Quién está fuera, quién sale pronto y cuántos días le quedan a cada persona."
                actions={
                    <button type="button" onClick={() => setRegister({})}>
                        <Icon name="plus" size={16} /> Registrar vacaciones
                    </button>
                }
            />

            <StateView state={state}>
                {data => {
                    const { absences, people, balances } = data
                    const outToday = absences.filter(a => isActiveOn(a, today))
                    const soon = absences
                        .filter(a => a.status === 'approved' && a.start > today && a.start <= addDaysYmd(today, 30))
                        .sort((x, y) => x.start.localeCompare(y.start))
                    const takenThisYear = absences
                        .filter(a => a.kind === 'vacation' && a.status === 'approved' && a.start.startsWith(String(year)))
                        .reduce((sum, a) => sum + a.days, 0)
                    const toExpire = balances.reduce((sum, b) => sum + Math.max(0, b.available), 0)

                    const departments = [...new Set(balances.map(b => b.department).filter(Boolean))].sort() as string[]
                    const q = query.trim().toLowerCase()
                    const rows = balances
                        .filter(b => (!dept || b.department === dept) && (!q || b.full_name.toLowerCase().includes(q)))
                        .sort((a, b) =>
                            sort === 'name'
                                ? a.full_name.localeCompare(b.full_name)
                                : sort === 'used'
                                  ? b.used - a.used
                                  : b.available - a.available
                        )

                    return (
                        <>
                            <section className="admin-stats">
                                <KpiTile label="Fuera hoy" value={outToday.length} icon="sun" tone="info" hint="Vacaciones y permisos" />
                                <KpiTile label="Salen en 30 días" value={soon.length} icon="calendar" tone="ok" />
                                <KpiTile label={`Días tomados en ${year}`} value={takenThisYear} icon="check" tone="ok" />
                                <KpiTile
                                    label="Días sin usar"
                                    value={toExpire}
                                    icon="alert"
                                    tone={daysLeft <= 60 ? 'warn' : 'info'}
                                    hint={`Vencen en ${daysLeft} días`}
                                />
                            </section>

                            <section className="abs-grid">
                                <article className="dashboard-card overview-panel">
                                    <header className="overview-panel-head">
                                        <span className="overview-panel-icon info"><Icon name="sun" size={17} /></span>
                                        <h2>Fuera hoy</h2>
                                        <span className="overview-count info">{outToday.length}</span>
                                    </header>

                                    {outToday.length === 0 ? (
                                        <div className="overview-empty">
                                            <Icon name="users" size={22} />
                                            <p>Todo el equipo está disponible hoy.</p>
                                        </div>
                                    ) : (
                                        <ul className="abs-list">
                                            {outToday.map(a => (
                                                <AbsenceItem
                                                    key={a.key}
                                                    a={a}
                                                    person={people.get(a.userId)}
                                                    meta={`Regresa ${short(addDaysYmd(a.end, 1))}`}
                                                    onOpen={setSelected}
                                                />
                                            ))}
                                        </ul>
                                    )}
                                </article>

                                <article className="dashboard-card overview-panel">
                                    <header className="overview-panel-head">
                                        <span className="overview-panel-icon ok"><Icon name="calendar" size={17} /></span>
                                        <h2>Próximas salidas</h2>
                                        <span className="overview-count ok">{soon.length}</span>
                                    </header>

                                    {soon.length === 0 ? (
                                        <div className="overview-empty">
                                            <Icon name="calendar" size={22} />
                                            <p>No hay ausencias aprobadas en los próximos 30 días.</p>
                                        </div>
                                    ) : (
                                        <ul className="abs-list">
                                            {soon.map(a => {
                                                const inDays = daysBetween(today, a.start)
                                                return (
                                                    <AbsenceItem
                                                        key={a.key}
                                                        a={a}
                                                        person={people.get(a.userId)}
                                                        meta={inDays === 1 ? 'Mañana' : `${short(a.start)} · en ${inDays} d`}
                                                        onOpen={setSelected}
                                                    />
                                                )
                                            })}
                                        </ul>
                                    )}
                                </article>
                            </section>

                            <section className="dashboard-card">
                                <div className="abs-section-head">
                                    <div>
                                        <h2>Calendario de ausencias</h2>
                                        <p className="muted">
                                            {short(from)} – {short(addDaysYmd(from, SPAN - 1))}
                                        </p>
                                    </div>

                                    <div className="abs-section-tools">
                                        <div className="tl-legend">
                                            <span><i className="abs-kind vacation" /> Vacaciones</span>
                                            <span><i className="abs-kind permission" /> Permisos</span>
                                            <span><i className="abs-kind pending" /> Pendiente</span>
                                        </div>
                                        <div className="year-stepper">
                                            <button type="button" aria-label="Semanas anteriores" onClick={() => setFrom(f => addDaysYmd(f, -SPAN))}>
                                                <Icon name="left" size={15} />
                                            </button>
                                            <button type="button" className="tl-today-btn" disabled={from === today} onClick={() => setFrom(today)}>
                                                Hoy
                                            </button>
                                            <button type="button" aria-label="Semanas siguientes" onClick={() => setFrom(f => addDaysYmd(f, SPAN))}>
                                                <Icon name="right" size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <AbsenceTimeline absences={absences} people={people} from={from} span={SPAN} onOpen={setSelected} />
                            </section>

                            <section className="dashboard-card">
                                <div className="abs-section-head">
                                    <div>
                                        <h2>Saldo de vacaciones {year}</h2>
                                        <p className="muted">Los días no usados vencen el 31 de diciembre y no se acumulan.</p>
                                    </div>

                                    <div className="table-toolbar abs-toolbar">
                                        <input type="search" placeholder="Buscar persona…" value={query} onChange={e => setQuery(e.target.value)} />
                                        <select value={dept} onChange={e => setDept(e.target.value)}>
                                            <option value="">Todas las áreas</option>
                                            {departments.map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
                                            <option value="available">Más días disponibles</option>
                                            <option value="used">Más días tomados</option>
                                            <option value="name">Nombre</option>
                                        </select>
                                    </div>
                                </div>

                                {!rows.length ? (
                                    <p className="empty">No hay personas con esos filtros.</p>
                                ) : (
                                    <div className="table-card">
                                        <div className="table-scroll">
                                            <table className="data-table bal-table">
                                                <thead>
                                                    <tr>
                                                        <th>Persona</th>
                                                        <th>Antigüedad</th>
                                                        <th className="num">Corresponden</th>
                                                        <th>Uso</th>
                                                        <th className="num">Disponibles</th>
                                                        <th className="col-actions" aria-label="Acciones" />
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {rows.map(b => {
                                                        const usedPct = b.entitlement ? (b.used / b.entitlement) * 100 : 0
                                                        const pendingPct = b.entitlement ? (b.pending / b.entitlement) * 100 : 0
                                                        const expiring = b.available > 0 && daysLeft <= 60

                                                        return (
                                                            <tr key={b.user_id}>
                                                                <td data-label="Persona">
                                                                    <div className="user-cell">
                                                                        <Avatar user={b} size="sm" />
                                                                        <div>
                                                                            <strong>{b.full_name}</strong>
                                                                            <small className="cell-sub">{b.department ?? b.position ?? 'Sin área'}</small>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td data-label="Antigüedad">{b.hire_date ? seniority(b.hire_date) : '—'}</td>
                                                                <td data-label="Corresponden" className="num">{b.entitlement}</td>
                                                                <td data-label="Uso">
                                                                    <div className="bal-usage">
                                                                        <div className="bal-bar" aria-hidden="true">
                                                                            <span className="used" style={{ width: `${usedPct}%` }} />
                                                                            <span className="pending" style={{ width: `${pendingPct}%` }} />
                                                                        </div>
                                                                        <small>
                                                                            {b.used} tomados{b.pending ? ` · ${b.pending} pendientes` : ''}
                                                                        </small>
                                                                    </div>
                                                                </td>
                                                                <td data-label="Disponibles" className="num">
                                                                    <span className={`bal-available ${expiring ? 'warn' : b.available <= 0 ? 'zero' : ''}`}>
                                                                        {b.available}
                                                                    </span>
                                                                    {expiring && <small className="cell-sub">por vencer</small>}
                                                                </td>
                                                                <td data-label="Acciones" className="col-actions">
                                                                    <button
                                                                        type="button"
                                                                        className="secondary compact"
                                                                        disabled={b.available <= 0}
                                                                        onClick={() => setRegister({ userId: b.user_id })}
                                                                    >
                                                                        <Icon name="plus" size={13} /> Registrar
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </>
                    )
                }}
            </StateView>

            {selected && (
                <RequestDetailModal
                    request={toRequestDetail(selected, state.data?.people.get(selected.userId))}
                    onClose={() => setSelected(null)}
                />
            )}

            {register && state.data && (
                <AdminVacationModal
                    token={token}
                    balances={state.data.balances}
                    initialUserId={register.userId}
                    onClose={() => setRegister(null)}
                />
            )}
        </div>
    )
}