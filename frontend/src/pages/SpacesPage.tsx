import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import type { Booking, Space, User } from '../lib/types'
import { BookingBoard } from '../components/BookingBoard'
import { MyBookings } from '../components/MyBookings'
import { StateView } from '../components/StatusBlocks'
import { PageHeader } from '../components/PageHeader'
import { RoomsIllustration } from '../components/RoomsIllustration'

export function SpacesPage({ token, user }: { token: string; user: User }) {
    const spaces = useAsync(() => api<Space[]>('/spaces', {}, token), [token])
    const mine = useAsync(() => api<Booking[]>('/bookings/mine', {}, token), [token])

    return (
        <div className="page-content">
            <PageHeader eyebrow="ESPACIOS" title="Salas y espacios" description="Consulta la disponibilidad y reserva tu horario." />

            <StateView state={spaces}>
                {list =>
                    list.length === 0 ? (
                        <div className="empty-state">
                            <RoomsIllustration />
                            <strong>Aún no hay espacios para reservar</strong>
                            <p className="muted">Cuando un administrador agregue salas o espacios, aparecerán aquí.</p>
                        </div>
                    ) : (
                        <BookingBoard token={token} user={user} spaces={list} onChanged={mine.reload} />
                    )
                }
            </StateView>

            <MyBookings token={token} state={mine} onChanged={mine.reload} />
        </div>
    )
}