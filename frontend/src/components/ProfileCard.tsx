import { useState } from 'react'
import { api } from '../lib/api'
import type { Profile, User } from '../lib/types'

const initials = (name: string) =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0])
        .join('')
        .toUpperCase()

export function ProfileCard({
    token,
    user,
    profile,
    onUserChange,
}: {
    token: string
    user: User
    profile: Profile
    onUserChange: (user: User) => void
}) {
    const [fullName, setFullName] = useState(profile.full_name)
    const [phone, setPhone] = useState(profile.phone ?? '')
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null)

    const save = async (event: React.FormEvent) => {
        event.preventDefault()
        setSaving(true)
        setStatus(null)

        try {
            const updated = await api<Profile>(
                '/profile',
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        full_name: fullName.trim(),
                        phone: phone.trim() || null,
                    }),
                },
                token
            )

            onUserChange({ ...user, full_name: updated.full_name })
            setStatus({ text: 'Perfil actualizado correctamente.', ok: true })
        } catch (error) {
            setStatus({
                text: error instanceof Error ? error.message : 'No se pudo guardar el perfil.',
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
                    <p className="eyebrow">CUENTA</p>
                    <h2>Perfil de usuario</h2>
                </div>
                <span className="dashboard-card-icon">☺</span>
            </div>

            <form className="settings-form" onSubmit={save}>
                <div className="profile-head">
                    <div className="profile-avatar">{initials(fullName) || '?'}</div>
                    <p className="muted">Actualiza tus datos personales.</p>
                </div>

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
                    <input value={profile.email} disabled />
                </label>

                <label>
                    Teléfono
                    <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        maxLength={30}
                        placeholder="Opcional"
                    />
                </label>

                {status && (
                    <p className={status.ok ? 'notice' : 'error'}>{status.text}</p>
                )}

                <button type="submit" className="compact" disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar perfil'}
                </button>
            </form>
        </article>
    )
}