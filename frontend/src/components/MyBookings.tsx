import { api } from '../lib/api'
import { formatDay, ymd } from '../lib/format'
import type { AsyncState } from '../lib/useAsync'
import type { Booking } from '../lib/types'
import { StateView } from './StatusBlocks'
import { useToast } from './Toast'

export function MyBookings({
    token,
    state,
    onChanged,
}: {
    token: string
    state: AsyncState<Booking[]>
    onChanged: () => void
}) {
    const toast = useToast()
    const today = ymd(new Date())

    const cancel = async (item: Booking) => {
        if (!window.confirm(`¿Cancelar la reserva "${item.title}"?`)) return

        try {
            await api(`/bookings/${item.id}/cancel`, { method: 'POST' }, token)
            toast.success('Reserva cancelada.')
            onChanged()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo cancelar.')
        }
    }

    return (
        <section className="dashboard-card history-card">
            <div className="section-title history-title">
                <h2>Mis reservas</h2>
            </div>

            <StateView state={state}>
                {items =>
                    items.length === 0 ? (
                        <p className="empty">Aún no tienes reservas.</p>
                    ) : (
                        <div className="table-card">
                            <div className="table-scroll">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Espacio</th>
                                            <th>Horario</th>
                                            <th>Reunión</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {items.map(b => {
                                            const past = b.booking_date < today
                                            const cancelled = b.status === 'cancelled'

                                            return (
                                                <tr key={b.id}>
                                                    <td data-label="Fecha">{formatDay(b.booking_date)}</td>
                                                    <td data-label="Espacio">{b.space_name}</td>
                                                    <td data-label="Horario">{b.start_time}–{b.end_time}</td>
                                                    <td data-label="Reunión">{b.title}</td>
                                                    <td data-label="Estado">
                                                        <span className={`badge ${cancelled ? 'cancelled' : past ? 'employee' : 'approved'}`}>
                                                            {cancelled ? 'Cancelada' : past ? 'Finalizada' : 'Confirmada'}
                                                        </span>
                                                    </td>
                                                    <td data-label="Acciones">
                                                        {!cancelled && !past ? (
                                                            <button type="button" className="link" onClick={() => cancel(b)}>
                                                                Cancelar
                                                            </button>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                }
            </StateView>
        </section>
    )
}