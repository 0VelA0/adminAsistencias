import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import type { AdminRecord, Page, TodayOverview as TodayOverviewData } from '../lib/types'
import { AdminRequestsPanel } from '../components/AdminRequestsPanel'
import { RecordTable } from '../components/RecordTable'
import { StateView } from '../components/StatusBlocks'
import { StationQrPanel } from '../components/StationQrPanel'
import { TodayOverview } from '../components/TodayOverview'
import { Icon } from '../components/Icon'
import { ymd, parseServerDate, toDate } from '../lib/format'
import { ManualRecordModal } from '../components/ManualRecordModal'
import type { ManualMode } from '../components/ManualRecordModal'
import { SearchField } from '../components/SearchField';
import { PageHeader } from '../components/PageHeader'

type Section = 'home' | 'requests' | 'attendance'

const TITLES: Record<Section, { eyebrow: string; title: string; text: string }> = {
    home: {
        eyebrow: 'RESUMEN',
        title: 'Resumen de hoy',
        text: 'Estado del equipo y solicitudes por atender.',
    },
    requests: {
        eyebrow: 'SOLICITUDES',
        title: 'Solicitudes del equipo',
        text: 'Aprueba o rechaza vacaciones y permisos.',
    },
    attendance: {
        eyebrow: 'ASISTENCIA',
        title: 'Asistencia del equipo',
        text: 'Entradas y salidas de todos los empleados.',
    },
}

const PAGE = 40

const hhmm = (value: string) =>
    parseServerDate(value).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

function daysAgo(date: string) {
    const diff = Math.round((toDate(ymd(new Date())).getTime() - toDate(date).getTime()) / 86_400_000)
    return diff === 1 ? 'Ayer' : `Hace ${diff} días`
}

function AdminHome({
    token,
    refresh,
    onNavigate,
}: {
    token: string
    refresh: number
    onNavigate: (page: Page) => void
}) {
    const overview = useAsync(
        () => api<TodayOverviewData>('/attendance/today-overview', {}, token),
        [token, refresh]
    )

    const pending = useAsync(async () => {
        const [vacations, permissions] = await Promise.all([
            api<{ status: string }[]>('/vacations/requests', {}, token),
            api<{ status: string }[]>('/permissions/requests', {}, token),
        ])

        return [...vacations, ...permissions].filter(r => r.status === 'pending').length
    }, [token, refresh])

    const data = overview.data

    return (
        <>
            <section className="admin-stats">
                <article className="overview-card">
                    <Icon name="check" />
                    <div>
                        <strong>{data ? data.registered.length : '–'}</strong>
                        <span>Registraron entrada hoy</span>
                    </div>
                </article>

                <article className="overview-card">
                    <Icon name="clock" />
                    <div>
                        <strong>
                            {data ? data.registered.filter(r => r.status === 'late').length : '–'}
                        </strong>
                        <span>Retardos hoy</span>
                    </div>
                </article>

                <article className="overview-card">
                    <Icon name="x" />
                    <div>
                        <strong>{data ? data.missing.length : '–'}</strong>
                        <span>Sin registrar</span>
                    </div>
                </article>

                <article
                    className="overview-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigate('admin-requests')}
                    onKeyDown={e => e.key === 'Enter' && onNavigate('admin-requests')}
                >
                    <Icon name="alert" />
                    <div>
                        <strong>{pending.data ?? '–'}</strong>
                        <span>Solicitudes por aprobar</span>
                    </div>
                </article>
            </section>

            <TodayOverview state={overview} />
        </>
    )
}

function AdminAttendance({ token, refresh }: { token: string; refresh: number }) {
    const records = useAsync(() => api<AdminRecord[]>('/attendance', {}, token), [token, refresh])

    const [query, setQuery] = useState('')
    const [visible, setVisible] = useState(PAGE)
    const [manual, setManual] = useState<ManualMode | null>(null)

    useEffect(() => setVisible(PAGE), [query])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        const all = records.data ?? []
        if (!q) return all

        return all.filter(r => `${r.user_name} ${r.user_email}`.toLowerCase().includes(q))
    }, [records.data, query])

    // Días pasados con entrada pero sin salida
    const pendingExits = useMemo(() => {
        const today = ymd(new Date())
        const days = new Map<
            string,
            { user_id: number; user_name: string; date: string; entry_at: string | null; exit: boolean }
        >()

        for (const r of records.data ?? []) {
            const date = r.work_date.slice(0, 10)
            const key = `${r.user_id}-${date}`
            const item = days.get(key) ?? { user_id: r.user_id, user_name: r.user_name, date, entry_at: null, exit: false }

            if (r.kind === 'entry') item.entry_at = r.recorded_at
            else item.exit = true

            days.set(key, item)
        }

        return [...days.values()]
            .filter(d => d.entry_at && !d.exit && d.date < today)
            .sort((a, b) => b.date.localeCompare(a.date))
    }, [records.data])

    const [showAllExits, setShowAllExits] = useState(false)
    const shownExits = showAllExits ? pendingExits : pendingExits.slice(0, 6)

    return (
        <>
            {pendingExits.length > 0 && (
                <section className="dashboard-card pending-exits">
                    <header className="pending-exits-head">
                        <span className="pending-exits-icon">
                            <Icon name="alert" size={20} />
                        </span>

                        <div>
                            <h2>Salidas pendientes de registrar</h2>
                            <p className="muted">
                                Entradas de días anteriores sin salida. Regístralas para que las horas y el reporte de
                                nómina cuadren.
                            </p>
                        </div>

                        <span className="pending-exits-count" aria-label={`${pendingExits.length} pendientes`}>
                            {pendingExits.length}
                        </span>
                    </header>

                    <div className="pending-exits-grid">
                        {shownExits.map((item, i) => {
                            const date = toDate(item.date)

                            return (
                                <article
                                    key={`${item.user_id}-${item.date}`}
                                    className="exit-card"
                                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                                >
                                    <div className="exit-date">
                                        <strong>{date.getDate()}</strong>
                                        <span>{date.toLocaleDateString('es-MX', { month: 'short' })}</span>
                                    </div>

                                    <div className="exit-info">
                                        <strong>{item.user_name}</strong>
                                        <span className="cap">
                                            {date.toLocaleDateString('es-MX', { weekday: 'long' })} · {daysAgo(item.date)}
                                        </span>
                                        <span className="exit-entry">
                                            <Icon name="login" size={12} /> Entrada {hhmm(item.entry_at!)} · <em>sin salida</em>
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        className="secondary compact"
                                        onClick={() =>
                                            setManual({ type: 'create', userId: item.user_id, date: item.date, kind: 'exit' })
                                        }
                                    >
                                        <Icon name="logout" size={14} /> Registrar salida
                                    </button>
                                </article>
                            )
                        })}
                    </div>

                    {pendingExits.length > 6 && (
                        <button type="button" className="link pending-exits-more" onClick={() => setShowAllExits(v => !v)}>
                            {showAllExits ? 'Ver menos' : `Ver las ${pendingExits.length} pendientes`}
                        </button>
                    )}
                </section>
            )}

            <section className="dashboard-card history-card">
                <div className="section-title history-title">
                    <h2>Registro general</h2>
                    <span>{filtered.length} registros</span>
                </div>

                <div className="toolbar">
                    <SearchField value={query} onChange={setQuery} placeholder="Buscar empleado…" />

                    <button type="button" className="compact" onClick={() => setManual({ type: 'create' })}>
                        <Icon name="plus" size={15} /> Registro manual
                    </button>
                </div>

                <StateView state={records}>
                    {() => (
                        <>
                            <RecordTable
                                records={filtered.slice(0, visible)}
                                admin
                                onEdit={record => setManual({ type: 'edit', record: record as AdminRecord })}
                            />

                            {filtered.length > visible && (
                                <button
                                    type="button"
                                    className="secondary compact show-more"
                                    onClick={() => setVisible(v => v + PAGE)}
                                >
                                    Mostrar más ({filtered.length - visible} restantes)
                                </button>
                            )}
                        </>
                    )}
                </StateView>
            </section>

            <StationQrPanel />

            {manual && (
                <ManualRecordModal
                    token={token}
                    mode={manual}
                    onClose={() => setManual(null)}
                    onSaved={records.reload}
                />
            )}
        </>
    )
}

export function AdminDashboardPage({
    token,
    section,
    onNavigate,
}: {
    token: string
    section: Section
    onNavigate: (page: Page) => void
}) {
    const [refresh, setRefresh] = useState(0)
    const titles = TITLES[section]

    return (
        <div className="page-content">
            <PageHeader
                eyebrow={titles.eyebrow}
                title={titles.title}
                description={titles.text}
                actions={
                    <button type="button" className="secondary" onClick={() => setRefresh(n => n + 1)}>
                        <Icon name="history" size={16} /> Actualizar
                    </button>
                }
            />

            {section === 'home' && (
                <AdminHome token={token} refresh={refresh} onNavigate={onNavigate} />
            )}

            {section === 'requests' && <AdminRequestsPanel key={refresh} token={token} />}

            {section === 'attendance' && <AdminAttendance token={token} refresh={refresh} />}
        </div>
    )
}