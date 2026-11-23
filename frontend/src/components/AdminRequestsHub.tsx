import { useState } from 'react'
import type { ReactNode } from 'react'
import { resolvedOn, useAdminAbsences } from '../lib/absences'
import type { Absence } from '../lib/absences'
import { parseServerDate, toDate, ymd } from '../lib/format'
import { Icon } from './Icon'
import { KpiTile } from './KpiTile'
import { RequestsHistory } from './RequestsHistory'

function RequestsTrend({ absences }: { absences: Absence[] }) {
    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date()
        d.setDate(1)
        d.setMonth(d.getMonth() - 5 + i)
        return ymd(d).slice(0, 7)
    })

    const data = months.map(m => {
        const inMonth = absences.filter(a => a.status !== 'pending' && resolvedOn(a).slice(0, 7) === m)
        const count = (s: Absence['status']) => inMonth.filter(a => a.status === s).length
        return { m, approved: count('approved'), rejected: count('rejected'), cancelled: count('cancelled'), total: inMonth.length }
    })

    const max = Math.max(1, ...data.map(d => d.total))

    return (
        <article className="dashboard-card req-trend">
            <header className="overview-panel-head">
                <span className="overview-panel-icon info"><Icon name="trend" size={17} /></span>
                <h2>Solicitudes resueltas · últimos 6 meses</h2>
            </header>

            <div className="req-bars">
                {data.map((d, i) => (
                    <div className="req-col" key={d.m} title={`${d.approved} aprobadas · ${d.rejected} rechazadas · ${d.cancelled} canceladas`}>
                        <span className="req-total">{d.total || ''}</span>
                        <div className="req-stack" style={{ height: `${(d.total / max) * 100}%`, animationDelay: `${i * 60}ms` }}>
                            {d.approved > 0 && <i className="ok" style={{ flexGrow: d.approved }} />}
                            {d.rejected > 0 && <i className="bad" style={{ flexGrow: d.rejected }} />}
                            {d.cancelled > 0 && <i className="muted" style={{ flexGrow: d.cancelled }} />}
                        </div>
                        <small className="cap">{toDate(`${d.m}-01`).toLocaleDateString('es-MX', { month: 'short' })}</small>
                    </div>
                ))}
            </div>

            <div className="tl-legend">
                <span><i className="req-dot ok" /> Aprobadas</span>
                <span><i className="req-dot bad" /> Rechazadas</span>
                <span><i className="req-dot muted" /> Canceladas</span>
            </div>
        </article>
    )
}

function ApprovalRate({ absences }: { absences: Absence[] }) {
    const year = String(new Date().getFullYear())
    const decided = absences.filter(a => (a.status === 'approved' || a.status === 'rejected') && resolvedOn(a).startsWith(year))
    const approved = decided.filter(a => a.status === 'approved')
    const rate = decided.length ? approved.length / decided.length : 0
    const ring = 2 * Math.PI * 42
    const byKind = (k: Absence['kind']) => decided.filter(a => a.kind === k).length

    return (
        <article className="dashboard-card req-rate">
            <header className="overview-panel-head">
                <span className="overview-panel-icon ok"><Icon name="pie" size={17} /></span>
                <h2>Tasa de aprobación {year}</h2>
            </header>

            <div className="hero-ring">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                    <circle className="hero-ring-track" cx="50" cy="50" r="42" />
                    <circle className="hero-ring-value" cx="50" cy="50" r="42" strokeDasharray={ring} strokeDashoffset={ring * (1 - rate)} />
                </svg>
                <div>
                    <strong>{decided.length ? `${Math.round(rate * 100)}%` : '–'}</strong>
                    <span>aprobadas</span>
                </div>
            </div>

            <dl className="req-rate-list">
                <div><dt>Decididas</dt><dd>{decided.length}</dd></div>
                <div><dt>Vacaciones</dt><dd>{byKind('vacation')}</dd></div>
                <div><dt>Permisos</dt><dd>{byKind('permission')}</dd></div>
            </dl>
        </article>
    )
}

export function AdminRequestsHub({ token, reviewPanel }: { token: string; reviewPanel: ReactNode }) {
    const state = useAdminAbsences(token)
    const [tab, setTab] = useState<'review' | 'history'>('review')

    const all = state.data?.absences ?? []
    const ready = Boolean(state.data)
    const month = ymd(new Date()).slice(0, 7)
    const pending = all.filter(a => a.status === 'pending').length
    const resolvedThisMonth = (s: Absence['status']) => all.filter(a => a.status === s && resolvedOn(a).slice(0, 7) === month).length

    // Tiempo promedio entre que llega una solicitud y se responde
    const answered = all.filter(a => a.reviewedAt && a.createdAt && (a.status === 'approved' || a.status === 'rejected'))
    const avgHours = answered.length
        ? answered.reduce(
              (sum, a) => sum + (parseServerDate(a.reviewedAt!).getTime() - parseServerDate(a.createdAt!).getTime()) / 3_600_000,
              0
          ) / answered.length
        : null
    const inDays = avgHours !== null && avgHours >= 48

    return (
        <>
            <section className="admin-stats">
                <KpiTile label="Por revisar" value={ready ? pending : null} icon="clipboard" tone="warn" onClick={() => setTab('review')} />
                <KpiTile label="Aprobadas" value={ready ? resolvedThisMonth('approved') : null} icon="check" tone="ok" hint="Este mes" />
                <KpiTile label="Rechazadas" value={ready ? resolvedThisMonth('rejected') : null} icon="x" tone="bad" hint="Este mes" />
                <KpiTile
                    label="Respuesta promedio"
                    value={avgHours === null ? null : Math.round(inDays ? avgHours / 24 : avgHours)}
                    suffix={inDays ? 'días' : 'h'}
                    icon="clock"
                    tone="info"
                />
            </section>

            {ready && (
                <section className="req-top">
                    <RequestsTrend absences={all} />
                    <ApprovalRate absences={all} />
                </section>
            )}

            <div className="news-filters" role="tablist">
                <button type="button" role="tab" aria-selected={tab === 'review'} className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>
                    <Icon name="clipboard" size={14} /> Por revisar {pending > 0 && <span className="tab-count">{pending}</span>}
                </button>
                <button type="button" role="tab" aria-selected={tab === 'history'} className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
                    <Icon name="history" size={14} /> Historial
                </button>
            </div>

            {tab === 'review' ? reviewPanel : state.data && <RequestsHistory absences={all} people={state.data.people} />}
        </>
    )
}