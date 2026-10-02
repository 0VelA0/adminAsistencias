import { Fragment, useEffect, useMemo, useState } from 'react'
import { formatDay } from '../lib/format'
import { matchesFilter } from '../lib/history'
import type { HistoryFilter, HistoryRow } from '../lib/history'

const PAGE_SIZE = 8

const FILTERS: { value: HistoryFilter; label: string }[] = [
    { value: 'all', label: 'Todo' },
    { value: 'attendance', label: 'Asistencia' },
    { value: 'requests', label: 'Todas las solicitudes' },
    { value: 'vacation', label: 'Vacaciones' },
    { value: 'permission', label: 'Permisos' },
]

function pageList(total: number, current: number): (number | '…')[] {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)

    const pages = [
        ...new Set(
            [1, total, current - 1, current, current + 1].filter(
                p => p >= 1 && p <= total
            )
        ),
    ].sort((a, b) => a - b)

    const out: (number | '…')[] = []
    pages.forEach((p, i) => {
        if (i > 0 && p - pages[i - 1] > 1) out.push('…')
        out.push(p)
    })

    return out
}

export function HistoryTable({
    rows,
    filter,
    onFilterChange,
}: {
    rows: HistoryRow[]
    filter: HistoryFilter
    onFilterChange: (filter: HistoryFilter) => void
}) {
    const [query, setQuery] = useState('')
    const [page, setPage] = useState(1)
    const [openId, setOpenId] = useState<string | null>(null)

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()

        return rows
            .filter(row => matchesFilter(row, filter))
            .filter(
                row =>
                    !q ||
                    [formatDay(row.sortKey), row.title, row.detail, row.label, ...row.lines]
                        .join(' ')
                        .toLowerCase()
                        .includes(q)
            )
    }, [rows, filter, query])

    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const current = Math.min(page, pages)
    const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

    useEffect(() => setPage(1), [query, filter])

    return (
        <section id="history-table" className="dashboard-card history-card">
            <div className="section-title history-title">
                <h2>Mi historial consolidado</h2>
                <span>{filtered.length} registros</span>
            </div>

            <div className="table-toolbar">
                <select
                    value={filter}
                    onChange={e => onFilterChange(e.target.value as HistoryFilter)}
                >
                    {FILTERS.map(f => (
                        <option key={f.value} value={f.value}>
                            {f.label}
                        </option>
                    ))}
                </select>

                <input
                    type="search"
                    placeholder="Buscar en el historial…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
            </div>

            {!visible.length ? (
                <p className="empty">No hay registros.</p>
            ) : (
                <div className="table-card">
                    <div className="table-scroll">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Tipo de registro</th>
                                    <th>Detalle</th>
                                    <th>Horas / Días</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {visible.map(row => {
                                    const open = openId === row.id

                                    return (
                                        <Fragment key={row.id}>
                                            <tr>
                                                <td data-label="Fecha">
                                                    {formatDay(row.sortKey)}
                                                </td>
                                                <td data-label="Tipo">
                                                    {row.icon} {row.title}
                                                </td>
                                                <td data-label="Detalle">{row.detail}</td>
                                                <td data-label="Horas / Días">{row.amount}</td>
                                                <td data-label="Estado">
                                                    <span className={`badge ${row.badge}`}>
                                                        {row.label}
                                                    </span>
                                                </td>
                                                <td data-label="Acciones">
                                                    <button
                                                        type="button"
                                                        className="link"
                                                        onClick={() =>
                                                            setOpenId(open ? null : row.id)
                                                        }
                                                    >
                                                        {open ? 'Ocultar' : 'Ver detalles'}
                                                    </button>
                                                </td>
                                            </tr>

                                            {open && (
                                                <tr className="detail-row">
                                                    <td colSpan={6}>
                                                        {row.lines.length ? (
                                                            row.lines.map((line, i) => (
                                                                <p key={i}>{line}</p>
                                                            ))
                                                        ) : (
                                                            <p>Sin información adicional.</p>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {pages > 1 && (
                <div className="pagination">
                    <button
                        type="button"
                        disabled={current === 1}
                        onClick={() => setPage(current - 1)}
                    >
                        Anterior
                    </button>

                    {pageList(pages, current).map((p, i) =>
                        p === '…' ? (
                            <span key={`gap-${i}`}>…</span>
                        ) : (
                            <button
                                key={p}
                                type="button"
                                className={p === current ? 'current' : ''}
                                onClick={() => setPage(p)}
                            >
                                {p}
                            </button>
                        )
                    )}

                    <button
                        type="button"
                        disabled={current === pages}
                        onClick={() => setPage(current + 1)}
                    >
                        Siguiente
                    </button>
                </div>
            )}
        </section>
    )
}