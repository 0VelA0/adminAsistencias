import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import type { Booking, Space, User } from '../lib/types'
import { BookingBoard } from '../components/BookingBoard'
import { MyBookings } from '../components/MyBookings'
import { StateView } from '../components/StatusBlocks'
import { PageHeader } from '../components/PageHeader'

export function SpacesPage({ token, user }: { token: string; user: User }) {
    const spaces = useAsync(() => api<Space[]>('/spaces', {}, token), [token])
    const mine = useAsync(() => api<Booking[]>('/bookings/mine', {}, token), [token])

    return (
        <div className="page-content">
            <PageHeader eyebrow="ESPACIOS" title="Salas y espacios" description="Consulta la disponibilidad y reserva tu horario." />

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