import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import type { Booking, Space, User } from '../lib/types'
import { BookingBoard } from '../components/BookingBoard'
import { MyBookings } from '../components/MyBookings'
import { StateView } from '../components/StatusBlocks'

export function SpacesPage({ token, user }: { token: string; user: User }) {
    const spaces = useAsync(() => api<Space[]>('/spaces', {}, token), [token])
    const mine = useAsync(() => api<Booking[]>('/bookings/mine', {}, token), [token])

    return (
        <div className="page-content">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">ESPACIOS</p>
                    <h2>Salas y espacios</h2>
                    <p className="muted">Consulta la disponibilidad y reserva tu horario.</p>
                </div>
            </div>

            <StateView state={spaces}>
                {list =>
                    list.length === 0 ? (
                        <p className="pending-request-empty">
                            Aún no hay espacios configurados. Pide a un administrador que los agregue.
                        </p>
                    ) : (
                        <BookingBoard token={token} user={user} spaces={list} onChanged={mine.reload} />
                    )
                }
            </StateView>

            <MyBookings token={token} state={mine} onChanged={mine.reload} />
        </div>
    )
}