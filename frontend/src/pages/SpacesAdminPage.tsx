import { useState } from 'react'
import { api } from '../lib/api'
import { toMin, DAY_LABELS } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { Space, User } from '../lib/types'
import { BookingBoard } from '../components/BookingBoard'
import { Icon } from '../components/Icon'
import { SpaceModal } from '../components/SpaceModal'
import { StateView } from '../components/StatusBlocks'
import { useToast } from '../components/Toast'
import { PageHeader } from '../components/PageHeader'

export function SpacesAdminPage({ token, user }: { token: string; user: User }) {
    const toast = useToast()
    const spaces = useAsync(() => api<Space[]>('/spaces?include_inactive=true', {}, token), [token])

    const [editing, setEditing] = useState<Space | null>(null)
    const [creating, setCreating] = useState(false)

    const remove = async (space: Space) => {
        if (!window.confirm(`¿Eliminar "${space.name}"? Esta acción no se puede deshacer.`)) return

        try {
            await api(`/spaces/${space.id}`, { method: 'DELETE' }, token)
            toast.success('Espacio eliminado.')
            spaces.reload()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo eliminar.')
        }
    }

    return (
        <div className="page-content">
            <PageHeader
                eyebrow="ESPACIOS"
                title="Espacios y reservas"
                description="Configura las salas de tu empresa y revisa sus reservas."
                actions={
                    <button type="button" onClick={() => setCreating(true)}>
                        <Icon name="plus" size={16} /> Nuevo espacio
                    </button>
                }
            />

            <StateView state={spaces}>
                {list => (
                    <>
                        <section className="dashboard-card history-card">
                            <div className="section-title history-title">
                                <h2>Espacios configurados</h2>
                                <span>{list.length} espacios</span>
                            </div>

                            {list.length === 0 ? (
                                <p className="empty">
                                    Todavía no hay espacios. Crea el primero: una sala de juntas, un auditorio,
                                    un cubículo… lo que tenga tu empresa.
                                </p>
                            ) : (
                                <div className="table-card">
                                    <div className="table-scroll">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Espacio</th>
                                                    <th>Tipo</th>
                                                    <th>Capacidad</th>
                                                    <th>Horario</th>
                                                    <th>Estado</th>
                                                    <th className="col-actions">Acciones</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {list.map(space => (
                                                    <tr key={space.id}>
                                                        <td data-label="Espacio">
                                                            <strong>{space.name}</strong>
                                                            {space.location && <small className="cell-sub">{space.location}</small>}
                                                        </td>
                                                        <td data-label="Tipo">{space.kind}</td>
                                                        <td data-label="Capacidad">{space.capacity}</td>
                                                        <td data-label="Horario">
                                                            {space.open_time}–{space.close_time}
                                                            <small className="cell-sub">
                                                                {space.open_days.map(d => DAY_LABELS[d]).join(' ')}
                                                            </small>
                                                        </td>
                                                        <td data-label="Estado">
                                                            <span className={`badge ${space.is_active ? 'approved' : 'cancelled'}`}>
                                                                {space.is_active ? 'Activo' : 'Inactivo'}
                                                            </span>
                                                        </td>
                                                        <td data-label="Acciones" className="col-actions">
                                                            <div className="row-actions">
                                                                <button type="button" className="compact" onClick={() => setEditing(space)}>
                                                                    Editar
                                                                </button>
                                                                <button type="button" className="secondary compact" onClick={() => remove(space)}>
                                                                    Eliminar
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </section>

                        {list.some(s => s.is_active) && (
                            <>
                                <div className="section-title history-title">
                                    <h2>Reservas por día</h2>
                                </div>

                                <BookingBoard
                                    token={token}
                                    user={user}
                                    spaces={list
                                        .filter(s => s.is_active)
                                        .sort((a, b) => toMin(a.open_time) - toMin(b.open_time))}
                                    onChanged={() => undefined}
                                />
                            </>
                        )}
                    </>
                )}
            </StateView>

            {(creating || editing) && (
                <SpaceModal
                    token={token}
                    space={editing}
                    onClose={() => {
                        setCreating(false)
                        setEditing(null)
                    }}
                    onSaved={spaces.reload}
                />
            )}
        </div>
    )
}