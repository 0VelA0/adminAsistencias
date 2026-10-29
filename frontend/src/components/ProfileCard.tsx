import { useState } from 'react'
import { api } from '../lib/api'
import type { Profile, User } from '../lib/types'
import { useToast } from './Toast'
import { Icon } from './Icon'
import { AvatarUploader } from './AvatarUploader'

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
    const toast = useToast()

    const [fullName, setFullName] = useState(profile.full_name)
    const [phone, setPhone] = useState(profile.phone ?? '')
    const [saving, setSaving] = useState(false)

    const fail = (error: unknown, fallback: string) =>
        toast.error(error instanceof Error ? error.message : fallback)

    const save = async (event: React.FormEvent) => {
        event.preventDefault()
        setSaving(true)

        try {
            const updated = await api<Profile>(
                '/profile',
                {
                    method: 'PUT',
                    body: JSON.stringify({ full_name: fullName.trim(), phone: phone.trim() || null }),
                },
                token
            )

            onUserChange({ ...user, full_name: updated.full_name })
            toast.success('Perfil actualizado correctamente.')
        } catch (error) {
            fail(error, 'No se pudo guardar el perfil.')
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
                <span className="dashboard-card-icon">
                    <Icon name="user" />
                </span>
            </div>

            <form className="settings-form" onSubmit={save}>
                <div className="profile-head">
                    <AvatarUploader token={token} user={user} onUserChange={onUserChange} size="lg" showRemove />

                    <div className="profile-head-text">
                        <strong>Foto de perfil</strong>
                        <small>Haz clic en la imagen para cambiarla. Se ajusta sola a un círculo.</small>
                    </div>
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

                <button type="submit" className="compact" disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar perfil'}
                </button>
            </form>
        </article>
    )
}