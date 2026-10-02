import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../lib/api'
import { ymd } from '../lib/format'
import type { AdminRecord } from '../lib/types'
import { RecordTable } from '../components/RecordTable'
import { AdminRequestsPanel } from '../components/AdminRequestsPanel'
import { MissingTodayCard } from '../components/MissingTodayCard'

const PAGE = 40

export function AdminDashboardPage({ token }: { token: string }) {
    const [records, setRecords] = useState<AdminRecord[]>([])
    const [qrImage, setQrImage] = useState('')
    const [pending, setPending] = useState(0)
    const [query, setQuery] = useState('')
    const [visible, setVisible] = useState(PAGE)
    const [refresh, setRefresh] = useState(0)
    const [error, setError] = useState('')

    const load = async () => {
        try {
            setRecords(await api<AdminRecord[]>('/attendance', {}, token))
            setError('')
        } catch (e) {
            setError(
                e instanceof Error ? e.message : 'No se pudo cargar el registro.'
            )
        }
    }

    useEffect(() => {
        load()
    }, [token])

    const reload = () => {
        load()
        setRefresh(n => n + 1) // remonta el panel de solicitudes
    }

    const generateStationQr = async () =>
        setQrImage(
            await QRCode.toDataURL(
                `${window.location.origin}/?station=recepcion`,
                { width: 240, margin: 1 }
            )
        )

    /* ---------- Estadísticas de hoy ---------- */

    const today = ymd(new Date())

    const todayRecords = records.filter(
        r => r.work_date.slice(0, 10) === today
    )

    const todayEntries = todayRecords.filter(r => r.kind === 'entry')

    const entered = new Set(todayEntries.map(r => r.user_email)).size

    const late = new Set(
        todayEntries.filter(r => r.status === 'late').map(r => r.user_email)
    ).size

    /* ---------- Registro general ---------- */

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return records

        return records.filter(r =>
            `${r.user_name} ${r.user_email}`.toLowerCase().includes(q)
        )
    }, [records, query])

    useEffect(() => setVisible(PAGE), [query])

    return (
        <div className="page-content">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">ADMINISTRACIÓN</p>
                    <h2>Panel administrativo</h2>
                    <p className="muted">
                        Resumen del día, solicitudes por aprobar y registros del equipo.
                    </p>
                </div>

                <button type="button" className="secondary compact" onClick={reload}>
                    Actualizar
                </button>
            </div>

            {error && <p className="error">{error}</p>}

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

                <article className="overview-card">
                    <span className="overview-icon alert">!</span>
                    <div>
                        <strong>{pending}</strong>
                        <span>Solicitudes por aprobar</span>
                    </div>
                </article>
            </section>

            <MissingTodayCard token={token} reloadKey={refresh} />

            <AdminRequestsPanel
                key={refresh}
                token={token}
                onPendingChange={setPending}
            />

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
        </div>
    )
}