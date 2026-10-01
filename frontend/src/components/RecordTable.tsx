import type { AttendanceRecord } from '../lib/types'

type Row = AttendanceRecord & {
    user_name?: string
    user_email?: string
}

const formatDate = (value: string) =>
    new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(
        'es-MX',
        {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }
    )

const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
    })

export function RecordTable({
    records,
    admin = false,
}: {
    records: Row[]
    admin?: boolean
}) {
    if (!records.length) {
        return <p className="empty">Aún no hay registros.</p>
    }

    return (
        <div className="table-card">
            <div className="table-scroll">
                <table className="data-table">
                    <thead>
                        <tr>
                            {admin && <th>Empleado</th>}
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Hora</th>
                            <th>Estado</th>
                            <th>Origen</th>
                            <th>Nota</th>
                        </tr>
                    </thead>

                    <tbody>
                        {records.map(record => (
                            <tr key={record.id}>
                                {admin && (
                                    <td data-label="Empleado">
                                        <strong>{record.user_name}</strong>
                                        <small className="cell-sub">
                                            {record.user_email}
                                        </small>
                                    </td>
                                )}

                                <td data-label="Fecha">
                                    {formatDate(record.work_date)}
                                </td>

                                <td data-label="Tipo">
                                    <span className={`badge ${record.kind}`}>
                                        {record.kind === 'entry'
                                            ? 'Entrada'
                                            : 'Salida'}
                                    </span>
                                </td>

                                <td data-label="Hora">
                                    <strong>
                                        {formatTime(record.recorded_at)}
                                    </strong>
                                </td>

                                <td data-label="Estado">
                                    <span
                                        className={`badge ${
                                            record.status === 'late'
                                                ? 'late'
                                                : 'normal'
                                        }`}
                                    >
                                        {record.status === 'late'
                                            ? 'Retraso'
                                            : 'Normal'}
                                    </span>
                                </td>

                                <td data-label="Origen">
                                    {record.source === 'admin'
                                        ? 'Registro manual'
                                        : `A ${Math.round(
                                              record.distance_meters
                                          )} m de la oficina`}
                                </td>

                                <td data-label="Nota">
                                    {record.note ?? '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}