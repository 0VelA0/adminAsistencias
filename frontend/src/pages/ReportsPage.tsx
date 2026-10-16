import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import { downloadBase64 } from '../lib/files'
import { uniqueSorted } from '../lib/people'
import { PERIODS, periodRange } from '../lib/periods'
import type { PeriodKey } from '../lib/periods'
import { useAsync } from '../lib/useAsync'
import { useCountUp } from '../lib/useCountUp'
import type { Person, ReportPreview } from '../lib/types'
import { Icon } from '../components/Icon'
import type { IconName } from '../components/Icon'
import { IncidenceCodesModal } from '../components/IncidenceCodesModal'
import { StateView } from '../components/StatusBlocks'
import { useToast } from '../components/Toast'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function Kpi({
    label,
    value,
    icon,
    tone,
    decimals = 0,
}: {
    label: string
    value: number
    icon: IconName
    tone: string
    decimals?: number
}) {
    const shown = useCountUp(value)

    return (
        <article className="overview-card kpi-card">
            <span className={`overview-icon ${tone}`}>
                <Icon name={icon} />
            </span>
            <div>
                <strong>
                    {shown.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                </strong>
                <span>{label}</span>
            </div>
        </article>
    )
}

export function ReportsPage({ token }: { token: string }) {
    const toast = useToast()

    const [period, setPeriod] = useState<PeriodKey>('this-fortnight')
    const [[start, end], setRange] = useState(() => periodRange('this-fortnight'))
    const [department, setDepartment] = useState('')
    const [userId, setUserId] = useState('')
    const [codesOpen, setCodesOpen] = useState(false)
    const [codesVersion, setCodesVersion] = useState(0)
    const [download, setDownload] = useState<'idle' | 'busy' | 'done'>('idle')

    const people = useAsync(() => api<Person[]>('/people?include_inactive=true', {}, token), [token])

    const departments = useMemo(() => uniqueSorted((people.data ?? []).map(p => p.department)), [people.data])

    const employees = (people.data ?? []).filter(
        p => p.role === 'employee' && (!department || p.department === department)
    )

    const body = JSON.stringify({
        start,
        end,
        department: department || null,
        user_id: userId ? Number(userId) : null,
    })

    const validRange = Boolean(start && end && start <= end)

    const preview = useAsync(
        () =>
            validRange
                ? api<ReportPreview>('/reports/attendance/preview', { method: 'POST', body }, token)
                : Promise.reject(new Error('La fecha final debe ser posterior a la inicial.')),
        [token, body, codesVersion]
    )

    const choosePeriod = (key: PeriodKey) => {
        setPeriod(key)
        if (key !== 'custom') setRange(periodRange(key))
    }

    const editDate = (which: 0 | 1, value: string) => {
        setPeriod('custom')
        setRange(current => (which === 0 ? [value, current[1]] : [current[0], value]))
    }

    const exportExcel = async () => {
        setDownload('busy')

        try {
            const file = await api<{ filename: string; content: string }>(
                '/reports/attendance/export',
                { method: 'POST', body },
                token
            )

            downloadBase64(file.filename, file.content, XLSX_MIME)
            setDownload('done')
            toast.success('Reporte descargado.')
            setTimeout(() => setDownload('idle'), 2200)
        } catch (error) {
            setDownload('idle')
            toast.error(error instanceof Error ? error.message : 'No se pudo generar el reporte.')
        }
    }

    const totals = preview.data?.totals ?? {}
    const t = (key: string) => totals[key] ?? 0

    return (
        <div className="page-content">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">REPORTES</p>
                    <h2>Reporte de asistencia</h2>
                    <p className="muted">Genera el Excel para nómina con las claves de incidencia de tu empresa.</p>
                </div>

                <div className="heading-actions">
                    <button type="button" className="secondary" onClick={() => setCodesOpen(true)}>
                        <Icon name="sliders" size={16} /> Claves de incidencia
                    </button>

                    <button
                        type="button"
                        className={`download-btn ${download}`}
                        disabled={download === 'busy' || !validRange || !preview.data?.people.length}
                        onClick={exportExcel}
                    >
                        {download === 'busy' && <span className="spinner" />}
                        {download === 'done' && <Icon name="check" size={16} />}
                        {download === 'idle' && <Icon name="download" size={16} />}
                        {download === 'busy' ? 'Generando…' : download === 'done' ? 'Descargado' : 'Descargar Excel'}
                    </button>
                </div>
            </div>

            <section className="dashboard-card report-filters">
                <div className="period-chips" role="radiogroup" aria-label="Periodo">
                    {PERIODS.map(p => (
                        <button
                            key={p.key}
                            type="button"
                            role="radio"
                            aria-checked={period === p.key}
                            className={period === p.key ? 'active' : ''}
                            onClick={() => choosePeriod(p.key)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                <div className="report-fields">
                    <label>
                        Desde
                        <input type="date" value={start} onChange={e => editDate(0, e.target.value)} />
                    </label>

                    <label>
                        Hasta
                        <input type="date" value={end} onChange={e => editDate(1, e.target.value)} />
                    </label>

                    <label>
                        Departamento
                        <select
                            value={department}
                            onChange={e => {
                                setDepartment(e.target.value)
                                setUserId('')
                            }}
                        >
                            <option value="">Todos</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </label>

                    <label>
                        Empleado
                        <select value={userId} onChange={e => setUserId(e.target.value)}>
                            <option value="">Todos</option>
                            {employees.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                        </select>
                    </label>
                </div>
            </section>

            <section className="kpi-grid">
                <Kpi label="Asistencias" value={t('attendance') + t('late')} icon="check" tone="approved" />
                <Kpi label="Retardos" value={t('late')} icon="clock" tone="pending" />
                <Kpi label="Faltas" value={t('absence')} icon="x" tone="rejected" />
                <Kpi label="Días de vacaciones" value={t('vacation')} icon="sun" tone="info" />
                <Kpi label="Días de permiso" value={t('paid_leave') + t('unpaid_leave')} icon="file" tone="alert" />
                <Kpi label="Horas trabajadas" value={preview.data?.hours ?? 0} icon="trend" tone="info" decimals={1} />
            </section>

            <section className="dashboard-card history-card">
                <div className="section-title history-title">
                    <h2>Vista previa</h2>
                    {preview.data && <span>{preview.data.people.length} empleados</span>}
                </div>

                <StateView state={preview}>
                    {data =>
                        data.people.length === 0 ? (
                            <p className="empty">No hay empleados con los filtros elegidos.</p>
                        ) : (
                            <div className="table-card">
                                <div className="table-scroll">
                                    <table className="data-table report-table">
                                        <thead>
                                            <tr>
                                                <th>Empleado</th>
                                                <th className="num">Días lab.</th>
                                                {data.codes.map(c => (
                                                    <th key={c.key} className="num" title={c.label}>
                                                        <span className="code-chip" style={{ background: c.color }}>{c.code}</span>
                                                    </th>
                                                ))}
                                                <th className="num">Horas</th>
                                                <th className="num">Retardo (min)</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {data.people.map(p => (
                                                <tr key={p.user_id}>
                                                    <td data-label="Empleado">
                                                        <strong>{p.full_name}</strong>
                                                        <small className="cell-sub">
                                                            {[p.employee_code, p.department].filter(Boolean).join(' · ') || 'Sin código'}
                                                        </small>
                                                    </td>
                                                    <td data-label="Días lab." className="num">{p.workdays}</td>
                                                    {data.codes.map(c => (
                                                        <td
                                                            key={c.key}
                                                            data-label={c.code}
                                                            className={`num ${p.counts[c.key] ? '' : 'zero'}`}
                                                        >
                                                            {p.counts[c.key] || '–'}
                                                        </td>
                                                    ))}
                                                    <td data-label="Horas" className="num">{p.hours.toFixed(2)}</td>
                                                    <td data-label="Retardo (min)" className="num">{p.late_minutes || '–'}</td>
                                                </tr>
                                            ))}
                                        </tbody>

                                        <tfoot>
                                            <tr>
                                                <td data-label="Totales"><strong>Totales</strong></td>
                                                <td data-label="Días lab." className="num">
                                                    {data.people.reduce((sum, p) => sum + p.workdays, 0)}
                                                </td>
                                                {data.codes.map(c => (
                                                    <td key={c.key} data-label={c.code} className="num">{data.totals[c.key]}</td>
                                                ))}
                                                <td data-label="Horas" className="num">{data.hours.toFixed(2)}</td>
                                                <td data-label="Retardo (min)" className="num">{data.late_minutes}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )
                    }
                </StateView>
            </section>

            {codesOpen && (
                <IncidenceCodesModal
                    token={token}
                    onClose={() => setCodesOpen(false)}
                    onSaved={() => setCodesVersion(v => v + 1)}
                />
            )}
        </div>
    )
}