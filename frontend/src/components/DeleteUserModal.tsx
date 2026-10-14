import { useState } from 'react'
import { api } from '../lib/api'
import type { User } from '../lib/types'
import { useToast } from './Toast'

export function DeleteUserModal({
    token,
    user,
    onClose,
    onDeleted,
}: {
    token: string
    user: User
    onClose: () => void
    onDeleted: () => void
}) {
    const toast = useToast()
    const [typed, setTyped] = useState('')
    const [busy, setBusy] = useState(false)

    const matches = typed.trim().toLowerCase() === user.email.toLowerCase()

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setBusy(true)

        try {
            await api(`/users/${user.id}?confirm=${encodeURIComponent(user.email)}`, { method: 'DELETE' }, token)
            toast.success(`${user.full_name} fue eliminado.`)
            onDeleted()
            onClose()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el usuario.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <form className="modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
                <p className="eyebrow">USUARIOS</p>
                <h2>Eliminar a {user.full_name}</h2>

                <p className="notice warning">
                    Se borrarán <strong>para siempre</strong> su asistencia, vacaciones, permisos y reservas.
                    Esta acción no se puede deshacer.
                </p>

                <p className="muted">
                    Si solo quieres que deje de entrar al sistema, usa <strong>Desactivar</strong>: conserva
                    su historial.
                </p>

                <label>
                    Para confirmar, escribe <strong>{user.email}</strong>
                    <input value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" />
                </label>

                <div className="modal-actions">
                    <button type="button" className="secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" className="danger" disabled={!matches || busy}>
                        {busy ? 'Eliminando…' : 'Eliminar definitivamente'}
                    </button>
                </div>
            </form>
        </div>
    )
}