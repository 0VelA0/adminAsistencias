import type { AttendanceRecord } from '../lib/types'

const format = (value: string) => new Date(value + 'Z').toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
export function RecordList({ records, admin = false }: { records: (AttendanceRecord & { user_name?: string; user_email?: string })[]; admin?: boolean }) {
  if (!records.length) return <p className="empty">Aún no hay registros.</p>
  return <div className="records">{records.map(record => <article key={record.id}><strong>{admin && `${record.user_name} · `}{record.kind === 'entry' ? 'Entrada' : 'Salida'}</strong><span>{format(record.recorded_at)}</span><small>{admin ? `${record.user_email} · ` : ''}A {Math.round(record.distance_meters)} m de la oficina</small></article>)}</div>
}
