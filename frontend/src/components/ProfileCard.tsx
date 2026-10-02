import { useRef,useState } from 'react'
import { api } from '../lib/api'
import type { Profile, User } from '../lib/types'
import { fileToAvatar } from '../lib/image'
import { Avatar } from './Avatar'

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

    const fileRef = useRef<HTMLInputElement>(null)
    const [avatarBusy, setAvatarBusy] = useState(false)

    const changeAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return

        setAvatarBusy(true)
        setStatus(null)

        try {
            const avatar = await fileToAvatar(file)

            const updated = await api<User>(
                '/profile/avatar',
                { method: 'PUT', body: JSON.stringify({ avatar }) },
                token
            )

            onUserChange(updated)
            setStatus({ text: 'Foto actualizada.', ok: true })
        } catch (error) {
            setStatus({
                text: error instanceof Error ? error.message : 'No se pudo cambiar la foto.',
                ok: false,
            })
        } finally {
            setAvatarBusy(false)
        }
    }

    const removeAvatar = async () => {
        setAvatarBusy(true)
        setStatus(null)

        try {
            onUserChange(await api<User>('/profile/avatar', { method: 'DELETE' }, token))
            setStatus({ text: 'Foto eliminada.', ok: true })
        } catch (error) {
            setStatus({
                text: error instanceof Error ? error.message : 'No se pudo eliminar la foto.',
                ok: false,
            })
        } finally {
            setAvatarBusy(false)
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
                    <Avatar user={user} className="profile-avatar" />

                    <div className="avatar-actions">
                        <button
                            type="button"
                            className="secondary compact"
                            disabled={avatarBusy}
                            onClick={() => fileRef.current?.click()}
                        >
                            {avatarBusy ? 'Procesando…' : 'Cambiar foto'}
                        </button>

                        {user.avatar && (
                            <button
                                type="button"
                                className="secondary compact"
                                disabled={avatarBusy}
                                onClick={removeAvatar}
                            >
                                Quitar
                            </button>
                        )}

                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={changeAvatar}
                        />
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