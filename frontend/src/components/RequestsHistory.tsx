import { useEffect, useMemo, useState } from 'react'
import { addDaysYmd, kindLabel, resolvedOn, toRequestDetail } from '../lib/absences'
import type { Absence, AbsenceKind } from '../lib/absences'
import { STATUS_LABEL, formatDay, formatRange, ymd } from '../lib/format'
import type { Person } from '../lib/types'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { RequestDetailModal } from './RequestDetailModal'

const PAGE = 12

export function RequestsHistory({ absences, people }: { absences: Absence[]; people: Map<number, Person> }) {
    const [type, setType] = useState<'all' | AbsenceKind>('all')
    const [status, setStatus] = useState<'resolved' | 'approved' | 'rejected' | 'cancelled'>('resolved')
    const [period, setPeriod] = useState<'30' | '90' | 'year' | 'all'>('90')
    const [query, setQuery] = useState('')
    const [limit, setLimit] = useState(PAGE)
    const [selected, setSelected] = useState<Absence | null>(null)

    useEffect(() => setLimit(PAGE), [type, status, period, query])

    const rows = useMemo(() => {
        const today = ymd(new Date())
        const since = period === 'all' ? '' : period === 'year' ? `${today.slice(0, 4)}-01-01` : addDaysYmd(today, -Number(period))
        const q = query.trim().toLowerCase()

        return absences
            .filter(a => a.status !== 'pending')
            .filter(a => type === 'all' || a.kind === type)
            .filter(a => status === 'resolved' || a.status === status)
            .filter(a => !since || resolvedOn(a) >= since)
            .filter(a => !q || `${a.name} ${a.email ?? ''} ${a.reason ?? ''}`.toLowerCase().includes(q))
            .sort((x, y) => resolvedOn(y).localeCompare(resolvedOn(x)))
    }, [absences, type, status, period, query])

    const count = (s: Absence['status']) => rows.filter(r => r.status === s).length

    return (
        <section className="dashboard-card history-card">
            <div className="abs-section-head">
                <div>
                    <h2>Historial de solicitudes</h2>
                    <p className="muted">
                        {rows.length} resueltas · {count('approved')} aprobadas · {count('rejected')} rechazadas · {count('cancelled')} canceladas
                    </p>
                </div>

                <div className="filter-tabs" role="tablist">
                    {([
                        ['all', 'Todas', 'clipboard'],
                        ['vacation', 'Vacaciones', 'sun'],
                        ['permission', 'Permisos', 'file'],
                    ] as const).map(([value, label, icon]) => (
                        <button key={value} type="button" className={type === value ? 'active' : ''} onClick={() => setType(value)}>
                            <Icon name={icon} size={13} /> {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="table-toolbar abs-toolbar">
                <input type="search" placeholder="Buscar persona o motivo…" value={query} onChange={e => setQuery(e.target.value)} />
                <select value={status} onChange={e => setStatus(e.target.value as typeof status)}>
                    <option value="resolved">Todos los estados</option>
                    <option value="approved">Aprobadas</option>
                    <option value="rejected">Rechazadas</option>
                    <option value="cancelled">Canceladas</option>
                </select>
                <select value={period} onChange={e => setPeriod(e.target.value as typeof period)}>
                    <option value="30">Últimos 30 días</option>
                    <option value="90">Últimos 90 días</option>
                    <option value="year">Este año</option>
                    <option value="all">Todo</option>
                </select>
            </div>

            {!rows.length ? (
                <div className="overview-empty">
                    <Icon name="history" size={22} />
                    <p>No hay solicitudes resueltas con esos filtros.</p>
                </div>
            ) : (
                <>
                    <div className="table-card">
                        <div className="table-scroll">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Persona</th>
                                        <th>Tipo</th>
                                        <th>Periodo</th>
                                        <th className="num">Días</th>
                                        <th>Estado</th>
                                        <th>Resolvió</th>
                                        <th aria-label="Ver detalle" />
                                    </tr>
                                </thead>

                                <tbody>
                                    {rows.slice(0, limit).map(a => (
                                        <tr
                                            key={a.key}
                                            className="clickable-row"
                                            tabIndex={0}
                                            role="button"
                                            aria-label={`Ver solicitud de ${a.name}`}
                                            onClick={() => setSelected(a)}
                                            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected(a))}
                                        >
                                            <td data-label="Persona">
                                                <div className="user-cell">
                                                    <Avatar user={{ full_name: a.name, avatar: people.get(a.userId)?.avatar ?? null }} size="sm" />
                                                    <div>
                                                        <strong>{a.name}</strong>
                                                        <small className="cell-sub">{people.get(a.userId)?.department ?? a.email ?? ''}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td data-label="Tipo">
                                                <i className={`abs-kind ${a.kind}`} /> {kindLabel(a)}
                                            </td>
                                            <td data-label="Periodo">{formatRange(a.start, a.end)}</td>
                                            <td data-label="Días" className="num">{a.days}</td>
                                            <td data-label="Estado">
                                                <span className={`badge ${a.status}`}>{STATUS_LABEL[a.status]}</span>
                                            </td>
                                            <td data-label="Resolvió">
                                                {a.status === 'cancelled' ? 'El empleado' : a.reviewedBy ?? '—'}
                                                <small className="cell-sub">{formatDay(resolvedOn(a))}</small>
                                            </td>
                                            <td className="row-chevron" aria-hidden="true">
                                                <Icon name="right" size={14} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {rows.length > limit && (
                        <button type="button" className="secondary compact show-more" onClick={() => setLimit(l => l + PAGE)}>
                            Ver más ({rows.length - limit} restantes)
                        </button>
                    )}
                </>
            )}

            {selected && (
                <RequestDetailModal request={toRequestDetail(selected, people.get(selected.userId))} onClose={() => setSelected(null)} />
            )}
        </section>
    )
}