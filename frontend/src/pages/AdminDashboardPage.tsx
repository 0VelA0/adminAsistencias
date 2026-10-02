import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../lib/api'
import { ymd } from '../lib/format'
import type { AdminRecord, Page } from '../lib/types'
import { RecordTable } from '../components/RecordTable'
import { AdminRequestsPanel } from '../components/AdminRequestsPanel'
import { MissingTodayCard } from '../components/MissingTodayCard'

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

export function AdminDashboardPage({
    token,
    section,
    onNavigate,
}: {
    token: string
    section: Section
    onNavigate: (page: Page) => void
}) {
    const [records, setRecords] = useState<AdminRecord[]>([])
    const [qrImage, setQrImage] = useState('')
    const [pending, setPending] = useState(0)
    const [query, setQuery] = useState('')
    const [visible, setVisible] = useState(PAGE)
    const [refresh, setRefresh] = useState(0)
    const [error, setError] = useState('')

    const titles = TITLES[section]

    useEffect(() => {
        if (section === 'requests') return

        api<AdminRecord[]>('/attendance', {}, token)
            .then(data => {
                setRecords(data)
                setError('')
            })
            .catch(e =>
                setError(e instanceof Error ? e.message : 'No se pudo cargar el registro.')
            )
    }, [token, section, refresh])

    useEffect(() => {
        if (section !== 'home') return

        Promise.all([
            api<{ status: string }[]>('/vacations/requests', {}, token),
            api<{ status: string }[]>('/permissions/requests', {}, token),
        ])
            .then(([vacations, permissions]) =>
                setPending(
                    [...vacations, ...permissions].filter(r => r.status === 'pending').length
                )
            )
            .catch(() => undefined)
    }, [token, section, refresh])

    useEffect(() => setVisible(PAGE), [query])

    const generateStationQr = async () =>
        setQrImage(
            await QRCode.toDataURL(`${window.location.origin}/?station=recepcion`, {
                width: 240,
                margin: 1,
            })
        )

    const today = ymd(new Date())
    const todayRecords = records.filter(r => r.work_date.slice(0, 10) === today)
    const todayEntries = todayRecords.filter(r => r.kind === 'entry')
    const entered = new Set(todayEntries.map(r => r.user_email)).size
    const late = new Set(
        todayEntries.filter(r => r.status === 'late').map(r => r.user_email)
    ).size

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return records

        return records.filter(r =>
            `${r.user_name} ${r.user_email}`.toLowerCase().includes(q)
        )
    }, [records, query])

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

            {error && <p className="error">{error}</p>}

            {section === 'home' && (
                <>
                    <section className="admin-stats">
                        <article className="overview-card">
                            <span className="overview-icon approved">✓</span>
                            <div>
                                <strong>{entered}</strong>
                                <span>Registraron entrada hoy</span>
                            </div>
                        </article>

                        <article className="overview-card">
                            <span className="overview-icon pending">◷</span>
                            <div>
                                <strong>{late}</strong>
                                <span>Retrasos hoy</span>
                            </div>
                        </article>

                        <article className="overview-card">
                            <span className="overview-icon info">⇄</span>
                            <div>
                                <strong>{todayRecords.length}</strong>
                                <span>Movimientos hoy</span>
                            </div>
                        </article>

                        <article
                            className="overview-card clickable"
                            role="button"
                            tabIndex={0}
                            onClick={() => onNavigate('admin-requests')}
                            onKeyDown={e => e.key === 'Enter' && onNavigate('admin-requests')}
                        >
                            <span className="overview-icon alert">!</span>
                            <div>
                                <strong>{pending}</strong>
                                <span>Solicitudes por aprobar</span>
                            </div>
                        </article>
                    </section>

                    <MissingTodayCard token={token} reloadKey={refresh} />
                </>
            )}

            {section === 'requests' && (
                <AdminRequestsPanel key={refresh} token={token} />
            )}

            {section === 'attendance' && (
                <>
                    <section className="dashboard-card history-card">
                        <div className="section-title history-title">
                            <h2>Registro general</h2>
                            <span>{filtered.length} registros</span>
                        </div>

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
                    </section>

                    <section className="qr-panel">
                        <div>
                            <p className="eyebrow">QR FIJO DE RECEPCIÓN</p>
                            <h2>Asistencia diaria</h2>

                            <p className="muted">
                                Imprime este QR y colócalo en recepción. No caduca: abre la
                                estación de asistencia y el sistema valida sesión y GPS.
                            </p>

                            <button type="button" onClick={generateStationQr}>
                                Mostrar QR para imprimir
                            </button>
                        </div>

                        {qrImage && <img src={qrImage} alt="QR fijo de recepción" />}
                    </section>
                </>
            )}
        </div>
    )
}