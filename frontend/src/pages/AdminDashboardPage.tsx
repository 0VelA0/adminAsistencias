import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import type { AdminRecord, Page, TodayOverview as TodayOverviewData } from '../lib/types'
import { AdminRequestsPanel } from '../components/AdminRequestsPanel'
import { RecordTable } from '../components/RecordTable'
import { StateView } from '../components/StatusBlocks'
import { StationQrPanel } from '../components/StationQrPanel'
import { TodayOverview } from '../components/TodayOverview'

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
                    <span className="overview-icon approved">✓</span>
                    <div>
                        <strong>{data ? data.registered.length : '–'}</strong>
                        <span>Registraron entrada hoy</span>
                    </div>
                </article>

                <article className="overview-card">
                    <span className="overview-icon pending">◷</span>
                    <div>
                        <strong>
                            {data ? data.registered.filter(r => r.status === 'late').length : '–'}
                        </strong>
                        <span>Retrasos hoy</span>
                    </div>
                </article>

                <article className="overview-card">
                    <span className="overview-icon rejected">×</span>
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
                    <span className="overview-icon alert">!</span>
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

    useEffect(() => setVisible(PAGE), [query])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        const all = records.data ?? []
        if (!q) return all

        return all.filter(r => `${r.user_name} ${r.user_email}`.toLowerCase().includes(q))
    }, [records.data, query])

    return (
        <>
            <section className="dashboard-card history-card">
                <div className="section-title history-title">
                    <h2>Registro general</h2>
                    <span>{filtered.length} registros</span>
                </div>

                <StateView state={records}>
                    {() => (
                        <>
                            <div className="table-toolbar">
                                <input
                                    type="search"
                                    placeholder="Buscar empleado…"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                />
                            </div>

                            <RecordTable records={filtered.slice(0, visible)} admin />

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
            <div className="page-heading">
                <div>
                    <p className="eyebrow">{titles.eyebrow}</p>
                    <h2>{titles.title}</h2>
                    <p className="muted">{titles.text}</p>
                </div>

                <button
                    type="button"
                    className="secondary compact"
                    onClick={() => setRefresh(n => n + 1)}
                >
                    Actualizar
                </button>
            </div>

            {section === 'home' && (
                <AdminHome token={token} refresh={refresh} onNavigate={onNavigate} />
            )}

            {section === 'requests' && <AdminRequestsPanel key={refresh} token={token} />}

            {section === 'attendance' && <AdminAttendance token={token} refresh={refresh} />}
        </div>
    )
}