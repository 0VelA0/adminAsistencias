import { useState } from 'react'
import { api } from '../lib/api'

export function SecurityCard({ token }: { token: string }) {
    const [current, setCurrent] = useState('')
    const [next, setNext] = useState('')
    const [confirm, setConfirm] = useState('')
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null)

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setStatus(null)

        if (next.length < 8) {
            setStatus({ text: 'La nueva contraseña debe tener al menos 8 caracteres.', ok: false })
            return
        }

        if (next !== confirm) {
            setStatus({ text: 'La confirmación no coincide con la nueva contraseña.', ok: false })
            return
        }

        setSaving(true)

        try {
            await api(
                '/auth/change-password',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        current_password: current,
                        new_password: next,
                    }),
                },
                token
            )

            setCurrent('')
            setNext('')
            setConfirm('')
            setStatus({ text: 'Contraseña actualizada correctamente.', ok: true })
        } catch (error) {
            setStatus({
                text: error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.',
                ok: false,
            })
        } finally {
            setSaving(false)
        }
    }

    return (
        <article className="dashboard-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">ACCESO</p>
                    <h2>Seguridad</h2>
                </div>
                <span className="dashboard-card-icon">🔒</span>
            </div>

            <form className="settings-form" onSubmit={submit}>
                <label>
                    Contraseña actual
                    <input
                        type="password"
                        autoComplete="current-password"
                        value={current}
                        onChange={e => setCurrent(e.target.value)}
                        required
                    />
                </label>

                <label>
                    Nueva contraseña
                    <input
                        type="password"
                        autoComplete="new-password"
                        value={next}
                        onChange={e => setNext(e.target.value)}
                        minLength={8}
                        required
                    />
                </label>

                <label>
                    Confirmar contraseña
                    <input
                        type="password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        required
                    />
                </label>

                {status && (
                    <p className={status.ok ? 'notice' : 'error'}>{status.text}</p>
                )}

                <button type="submit" className="compact" disabled={saving}>
                    {saving ? 'Actualizando…' : 'Cambiar contraseña'}
                </button>
            </form>
        </article>
    )
}