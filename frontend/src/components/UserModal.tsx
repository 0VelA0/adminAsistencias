import { useState } from 'react'
import { api } from '../lib/api'
import type { UserCreated } from '../lib/types'

export function UserModal({
    token,
    onClose,
    onCreated,
}: {
    token: string
    onClose: () => void
    onCreated: (user: UserCreated) => void
}) {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<'employee' | 'admin'>('employee')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    const [hireDate, setHireDate] = useState('')

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setSending(true)
        setError('')

        try {
            const created = await api<UserCreated>(
                '/users',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        email: email.trim(),
                        full_name: fullName.trim(),
                        role,
                        hire_date: hireDate || null,
                    }),
                },
                token
            )

            onCreated(created)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo crear el usuario.')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <form className="modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
                <p className="eyebrow">USUARIOS</p>
                <h2>Nuevo usuario</h2>

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
                    Correo electrónico
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
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

                <label>
                    Fecha de ingreso
                    <input
                        type="date"
                        value={hireDate}
                        onChange={e => setHireDate(e.target.value)}
                    />
                </label>

                <p className="muted">
                    Se generará una contraseña temporal que verás una sola vez.
                </p>

                {error && <p className="error">{error}</p>}

                <div className="modal-actions">
                    <button type="button" className="secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={sending}>
                        {sending ? 'Creando…' : 'Crear usuario'}
                    </button>
                </div>
            </form>
        </div>
    )
}