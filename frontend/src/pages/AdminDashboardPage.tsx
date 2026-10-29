import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import type { AdminRecord, Page, TodayOverview as TodayOverviewData } from '../lib/types'
import { AdminRequestsPanel } from '../components/AdminRequestsPanel'
import { RecordTable } from '../components/RecordTable'
import { StateView } from '../components/StatusBlocks'
import { StationQrPanel } from '../components/StationQrPanel'
import { TodayOverview } from '../components/TodayOverview'
import { Icon, IconName } from '../components/Icon'
import { ymd, parseServerDate, toDate } from '../lib/format'
import { ManualRecordModal } from '../components/ManualRecordModal'
import type { ManualMode } from '../components/ManualRecordModal'
import { SearchField } from '../components/SearchField';
import { PageHeader } from '../components/PageHeader'
import { useCountUp } from '../lib/useCountUp'
import { useAppEvent } from '../lib/events'

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

function StatTile({
    label,
    value,
    icon,
    tone,
    onClick,
}: {
    label: string
    value: number | null
    icon: IconName
    tone: string
    onClick?: () => void
}) {
    const shown = useCountUp(value ?? 0)

    return (
        <article
            className={`stat-tile ${tone} ${onClick ? 'clickable' : ''}`}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick}
            onKeyDown={e => onClick && e.key === 'Enter' && onClick()}
        >
            <span className="stat-icon">
                <Icon name={icon} size={18} />
            </span>
            <strong>{value === null ? '–' : Math.round(shown)}</strong>
            <span>{label}</span>
            {onClick && <Icon name="right" size={14} />}
        </article>
    )
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
    const overview = useAsync(() => api<TodayOverviewData>('/attendance/today-overview', {}, token), [token, refresh])

    const pending = useAsync(async () => {
        const [vacations, permissions] = await Promise.all([
            api<{ status: string }[]>('/vacations/requests', {}, token),
            api<{ status: string }[]>('/permissions/requests', {}, token),
        ])

        return [...vacations, ...permissions].filter(r => r.status === 'pending').length
    }, [token, refresh])

    useAppEvent('requests:changed', pending.reload)

    useEffect(() => {
        const id = setInterval(() => {
            if (document.visibilityState === 'visible') {
                overview.reload()
                pending.reload()
            }
        }, 60_000)

        return () => clearInterval(id)
    }, [overview.reload, pending.reload])

    const data = overview.data
    const registered = data?.registered.length ?? 0
    const late = data?.registered.filter(r => r.status === 'late').length ?? 0
    const remote = data?.registered.filter(r => r.remote).length ?? 0
    const missing = data?.missing.length ?? 0
    const waiting = data?.pending_count ?? 0
    const away = (data?.on_vacation.length ?? 0) + (data?.on_permission.length ?? 0)
    const expected = registered + missing + waiting
    const rate = expected ? registered / expected : 0
    const ring = 2 * Math.PI * 42

    const headline = !data
        ? 'Cargando el día…'
        : data.holiday_name
          ? `Hoy es festivo: ${data.holiday_name}`
          : !data.is_workday
            ? 'Hoy no es día laborable'
            : `${registered} de ${expected} ${expected === 1 ? 'persona ya inició' : 'personas ya iniciaron'} su jornada`

    return (
        <>
            <section className="admin-hero">
                <div className="hero-ring" aria-label={`Asistencia de hoy: ${Math.round(rate * 100)}%`}>
                    <svg viewBox="0 0 100 100" aria-hidden="true">
                        <circle className="hero-ring-track" cx="50" cy="50" r="42" />
                        <circle
                            className="hero-ring-value"
                            cx="50"
                            cy="50"
                            r="42"
                            strokeDasharray={ring}
                            strokeDashoffset={ring * (1 - rate)}
                        />
                    </svg>
                    <div>
                        <strong>{Math.round(rate * 100)}%</strong>
                        <span>asistencia</span>
                    </div>
                </div>

                <div className="admin-hero-text">
                    <p className="eyebrow cap">
                        {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <h3>{headline}</h3>

                    <div className="hero-chips">
                        <span className="hero-chip warn"><Icon name="clock" size={12} /> {late} retardos</span>
                        <span className="hero-chip teal"><Icon name="home" size={12} /> {remote} remotos</span>
                        <span className="hero-chip blue"><Icon name="sun" size={12} /> {away} ausencias autorizadas</span>
                        {waiting > 0 && <span className="hero-chip muted"><Icon name="history" size={12} /> {waiting} en tolerancia</span>}
                    </div>
                </div>

                <div className="admin-hero-actions">
                    <button type="button" onClick={() => onNavigate('admin-requests')}>
                        <Icon name="clipboard" size={15} /> Solicitudes
                        {(pending.data ?? 0) > 0 && <span className="hero-count">{pending.data}</span>}
                    </button>
                    <button type="button" className="secondary" onClick={() => onNavigate('admin-attendance')}>
                        <Icon name="edit" size={15} /> Registro manual
                    </button>
                    <button type="button" className="secondary" onClick={() => onNavigate('admin-reports')}>
                        <Icon name="download" size={15} /> Reporte
                    </button>
                </div>
            </section>

            <section className="admin-stats">
                <StatTile label="Iniciaron jornada" value={data ? registered : null} icon="check" tone="ok" />
                <StatTile label="Retardos" value={data ? late : null} icon="clock" tone="warn" />
                <StatTile label="Sin registrar" value={data ? missing : null} icon="alert" tone="bad" />
                <StatTile
                    label="Por aprobar"
                    value={pending.data ?? null}
                    icon="clipboard"
                    tone="info"
                    onClick={() => onNavigate('admin-requests')}
                />
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