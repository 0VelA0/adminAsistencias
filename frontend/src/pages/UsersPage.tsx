import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import type { User, UserCreated } from '../lib/types'
import { UserModal } from '../components/UserModal'
import { CredentialsModal } from '../components/CredentialModal'
import { EditUserModal } from '../components/EditUserModal'
import { Avatar } from '../components/Avatar'
import { formatDay } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { StateView } from '../components/StatusBlocks'

type Credentials = {
    title: string
    name: string
    email: string
    password: string
}

export function UsersPage({
    token,
    currentUser,
}: {
    token: string
    currentUser: User
}) {
    const list = useAsync(() => api<User[]>('/users', {}, token), [token])
    const users = list.data ?? []
    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
    const [showCreate, setShowCreate] = useState(false)
    const [credentials, setCredentials] = useState<Credentials | null>(null)
    const [busyId, setBusyId] = useState<number | null>(null)
    const [error, setError] = useState('')
    const [editing, setEditing] = useState<User | null>(null)

    const load = list.reload

    const toggleActive = async (user: User) => {
        const verb = user.is_active ? 'desactivar' : 'activar'

        if (!window.confirm(`¿Quieres ${verb} a ${user.full_name}?`)) return

        setBusyId(user.id)

        try {
            await api(
                `/users/${user.id}`,
                { method: 'PATCH', body: JSON.stringify({ is_active: !user.is_active }) },
                token
            )
            await load()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo actualizar el usuario.')
        } finally {
            setBusyId(null)
        }
    }

    const handleSaved = async (updated: User, newPassword: string | null) => {
        setEditing(null)

        if (newPassword) {
            setCredentials({
                title: 'Contraseña actualizada',
                name: updated.full_name,
                email: updated.email,
                password: newPassword,
            })
        }

        await load()
    }

    const handleCreated = async (created: UserCreated) => {
        setShowCreate(false)
        setCredentials({
            title: 'Usuario creado',
            name: created.full_name,
            email: created.email,
            password: created.temporary_password,
        })
        await load()
    }

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase()

        return users
            .filter(u =>
                filter === 'all' ? true : filter === 'active' ? u.is_active : !u.is_active
            )
            .filter(u => !q || `${u.full_name} ${u.email}`.toLowerCase().includes(q))
    }, [users, query, filter])

    const active = users.filter(u => u.is_active).length
    const admins = users.filter(u => u.role === 'admin').length

    return (
        <div className="page-content">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">ADMINISTRACIÓN</p>
                    <h2>Usuarios</h2>
                    <p className="muted">Crea cuentas y gestiona el acceso del equipo.</p>
                </div>

                <button type="button" onClick={() => setShowCreate(true)}>
                    + Nuevo usuario
                </button>
            </div>

            {error && <p className="error">{error}</p>}

            <section className="admin-stats">
                <article className="overview-card">
                    <span className="overview-icon info">☺</span>
                    <div>
                        <strong>{users.length}</strong>
                        <span>Usuarios en total</span>
                    </div>
                </article>

                <article className="overview-card">
                    <span className="overview-icon approved">✓</span>
                    <div>
                        <strong>{active}</strong>
                        <span>Activos</span>
                    </div>
                </article>

                <article className="overview-card">
                    <span className="overview-icon rejected">×</span>
                    <div>
                        <strong>{users.length - active}</strong>
                        <span>Inactivos</span>
                    </div>
                </article>

                <article className="overview-card">
                    <span className="overview-icon pending">★</span>
                    <div>
                        <strong>{admins}</strong>
                        <span>Administradores</span>
                    </div>
                </article>
            </section>

            <StateView state={list}>
                {() => (

                    <section className="dashboard-card history-card">
                        <div className="section-title history-title">
                            <h2>Todos los usuarios</h2>
                            <span>{rows.length} usuarios</span>
                        </div>

                        <div className="table-toolbar">
                            <div className="filter-tabs">
                                {(
                                    [
                                        ['all', 'Todos'],
                                        ['active', 'Activos'],
                                        ['inactive', 'Inactivos'],
                                    ] as const
                                ).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={filter === value ? 'active' : ''}
                                        onClick={() => setFilter(value)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <input
                                type="search"
                                placeholder="Buscar por nombre o correo…"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                        </div>

                        {!rows.length ? (
                            <p className="empty">No hay usuarios.</p>
                        ) : (
                            <div className="table-card">
                                <div className="table-scroll">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Usuario</th>
                                                <th>Rol</th>
                                                <th>Estado</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {rows.map(user => {
                                                const isMe = user.id === currentUser.id

                                                return (
                                                    <tr key={user.id}>
                                                        <td data-label="Usuario">
                                                            <div className="user-cell">
                                                                <Avatar user={user}  />

                                                                <div>
                                                                    <strong>
                                                                        {user.full_name}
                                                                        {isMe && ' (tú)'}
                                                                    </strong>
                                                                    <small className="cell-sub">{user.email}</small>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        
                                                        <td data-label="Ingreso">{user.hire_date ? formatDay(user.hire_date) : '—'}</td>

                                                        <td data-label="Rol">
                                                            <span className={`badge ${user.role}`}>
                                                                {user.role === 'admin'
                                                                    ? 'Administrador'
                                                                    : 'Empleado'}
                                                            </span>
                                                        </td>

                                                        <td data-label="Estado">
                                                            <span
                                                                className={`badge ${
                                                                    user.is_active ? 'approved' : 'cancelled'
                                                                }`}
                                                            >
                                                                {user.is_active ? 'Activo' : 'Inactivo'}
                                                            </span>
                                                        </td>

                                                        <td data-label="Acciones">
                                                            {isMe ? (
                                                                '—'
                                                            ) : (
                                                                <div className="row-actions">
                                                                    <button
                                                                        type="button"
                                                                        className="compact"
                                                                        disabled={busyId === user.id}
                                                                        onClick={() => setEditing(user)}
                                                                    >
                                                                        Editar
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className="secondary compact"
                                                                        disabled={busyId === user.id}
                                                                        onClick={() => toggleActive(user)}
                                                                    >
                                                                        {user.is_active ? 'Desactivar' : 'Activar'}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>
                )}
            </StateView>

            {showCreate && (
                <UserModal
                    token={token}
                    onClose={() => setShowCreate(false)}
                    onCreated={handleCreated}
                />
            )}

            {credentials && (
                <CredentialsModal {...credentials} onClose={() => setCredentials(null)} />
            )}
            {editing && (
                <EditUserModal
                    token={token}
                    user={editing}
                    onClose={() => setEditing(null)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    )
}