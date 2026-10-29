import { useRef, useState } from 'react'
import { api } from '../lib/api'
import { fileToAvatar } from '../lib/image'
import type { User } from '../lib/types'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { useToast } from './Toast'

export function AvatarUploader({
    token,
    user,
    onUserChange,
    size = 'xl',
    showRemove = false,
}: {
    token: string
    user: User
    onUserChange: (user: User) => void
    size?: 'lg' | 'xl'
    showRemove?: boolean
}) {
    const toast = useToast()
    const fileRef = useRef<HTMLInputElement>(null)
    const [busy, setBusy] = useState(false)

    const change = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return

        setBusy(true)

        try {
            const avatar = await fileToAvatar(file)
            onUserChange(await api<User>('/profile/avatar', { method: 'PUT', body: JSON.stringify({ avatar }) }, token))
            toast.success('Foto actualizada.')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo cambiar la foto.')
        } finally {
            setBusy(false)
        }
    }

    const remove = async () => {
        setBusy(true)

        try {
            onUserChange(await api<User>('/profile/avatar', { method: 'DELETE' }, token))
            toast.success('Foto eliminada.')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la foto.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className={`avatar-uploader ${size}`}>
            <button
                type="button"
                className="avatar-uploader-button"
                disabled={busy}
                aria-label="Cambiar foto de perfil"
                title="Cambiar foto"
                onClick={() => fileRef.current?.click()}
            >
                <Avatar user={user} size="lg" />

                <span className="avatar-uploader-overlay">
                    {busy ? <span className="spinner" /> : <Icon name="image" size={20} />}
                </span>

                <span className="avatar-edit">
                    <Icon name="edit" size={12} />
                </span>
            </button>

            <input ref={fileRef} type="file" accept="image/*" hidden onChange={change} />

            {showRemove && user.avatar && (
                <button type="button" className="link avatar-remove" disabled={busy} onClick={remove}>
                    Quitar foto
                </button>
            )}
        </div>
    )
}