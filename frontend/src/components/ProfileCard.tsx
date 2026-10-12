import { useRef, useState } from 'react'
import { api } from '../lib/api'
import { fileToAvatar } from '../lib/image'
import type { Profile, User } from '../lib/types'
import { Avatar } from './Avatar'
import { useToast } from './Toast'
import { Icon } from './Icon'

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
    const fileRef = useRef<HTMLInputElement>(null)

    const [fullName, setFullName] = useState(profile.full_name)
    const [phone, setPhone] = useState(profile.phone ?? '')
    const [saving, setSaving] = useState(false)
    const [avatarBusy, setAvatarBusy] = useState(false)

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

    const changeAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return

        setAvatarBusy(true)

        try {
            const avatar = await fileToAvatar(file)

            onUserChange(
                await api<User>(
                    '/profile/avatar',
                    { method: 'PUT', body: JSON.stringify({ avatar }) },
                    token
                )
            )

            toast.success('Foto actualizada.')
        } catch (error) {
            fail(error, 'No se pudo cambiar la foto.')
        } finally {
            setAvatarBusy(false)
        }
    }

    const removeAvatar = async () => {
        setAvatarBusy(true)

        try {
            onUserChange(await api<User>('/profile/avatar', { method: 'DELETE' }, token))
            toast.success('Foto eliminada.')
        } catch (error) {
            fail(error, 'No se pudo eliminar la foto.')
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
                <span className="dashboard-card-icon">
                    <Icon name="user" />
                </span>
            </div>

            <form className="settings-form" onSubmit={save}>
                <div className="profile-head">
                    <Avatar user={user} size="lg" />

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

                        <input ref={fileRef} type="file" accept="image/*" hidden onChange={changeAvatar} />
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