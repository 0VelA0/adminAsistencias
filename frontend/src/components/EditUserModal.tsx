import { useState } from 'react'
import { api } from '../lib/api'
import type { User } from '../lib/types'

const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    const bytes = crypto.getRandomValues(new Uint32Array(12))
    return Array.from(bytes, b => chars[b % chars.length]).join('')
}

export function EditUserModal({
    token,
    user,
    onClose,
    onSaved,
}: {
    token: string
    user: User
    onClose: () => void
    onSaved: (user: User, newPassword: string | null) => Promise<void>
}) {
    const [fullName, setFullName] = useState(user.full_name)
    const [role, setRole] = useState<'employee' | 'admin'>(
        user.role === 'admin' ? 'admin' : 'employee'
    )
    const [password, setPassword] = useState('')
    const [visible, setVisible] = useState(false)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    const [hireDate, setHireDate] = useState(user.hire_date ?? '')

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setError('')

        if (password && password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.')
            return
        }

        const body: Record<string, unknown> = {}

        if (hireDate && hireDate !== (user.hire_date ?? '')) body.hire_date = hireDate

        if (fullName.trim() !== user.full_name) body.full_name = fullName.trim()
        if (role !== user.role) body.role = role
        if (password) body.password = password

        if (!Object.keys(body).length) {
            onClose()
            return
        }

        setSending(true)

        try {
            const updated = await api<User>(
                `/users/${user.id}`,
                { method: 'PATCH', body: JSON.stringify(body) },
                token
            )

            await onSaved(updated, password || null)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar.')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <form className="modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
                <p className="eyebrow">USUARIOS</p>
                <h2>Editar usuario</h2>

                <p className="muted">{user.email}</p>

                <label>
                    Nombre completo
                    <input
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        minLength={2}
                        maxLength={150}
                        required
                    />
                </label>

                <label>
                    Rol
                    <select
                        value={role}
                        onChange={e => setRole(e.target.value as 'employee' | 'admin')}
                    >
                        <option value="employee">Empleado</option>
                        <option value="admin">Administrador</option>
                    </select>
                </label>

                {role === 'admin' && user.role !== 'admin' && (
                    <p className="notice">
                        Un administrador puede ver y gestionar a todo el equipo, aprobar
                        solicitudes y crear usuarios.
                    </p>
                )}

                <label>
                    Nueva contraseña
                    <div className="password-row">
                        <input
                            type={visible ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Vacío = no cambiar"
                        />

                        <button
                            type="button"
                            className="secondary compact"
                            onClick={() => setVisible(v => !v)}
                        >
                            {visible ? 'Ocultar' : 'Ver'}
                        </button>

                        <button
                            type="button"
                            className="secondary compact"
                            onClick={() => {
                                setPassword(generatePassword())
                                setVisible(true)
                            }}
                        >
                            Generar
                        </button>
                    </div>
                </label>

                {error && <p className="error">{error}</p>}

                <div className="modal-actions">
                    <button type="button" className="secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={sending}>
                        {sending ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                </div>
            </form>
        </div>
    )
}