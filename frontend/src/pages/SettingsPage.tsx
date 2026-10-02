import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { NotificationSettings, Profile, User } from '../lib/types'
import { ProfileCard } from '../components/ProfileCard'
import { NotificationsCard } from '../components/NotificationsCard'
import { SecurityCard } from '../components/SecurityCard'

export function SettingsPage({
    token,
    user,
    onUserChange,
}: {
    token: string
    user: User
    onUserChange: (user: User) => void
}) {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [notifications, setNotifications] = useState<NotificationSettings | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        Promise.all([
            api<Profile>('/profile', {}, token),
            api<NotificationSettings>('/profile/notifications', {}, token),
        ])
            .then(([p, n]) => {
                setProfile(p)
                setNotifications(n)
            })
            .catch(e =>
                setError(e instanceof Error ? e.message : 'No se pudo cargar la configuración.')
            )
    }, [token])

    return (
        <div className="page-content">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">CONFIGURACIÓN</p>
                    <h2>Panel de Configuración</h2>
                    <p className="muted">Gestiona tu perfil, notificaciones y seguridad.</p>
                </div>

                <span className="page-date">
                    {new Date().toLocaleDateString('es-MX', { dateStyle: 'full' })}
                </span>
            </div>

            {error && <p className="error">{error}</p>}

            {profile && notifications && (
                <section className="settings-grid">
                    <ProfileCard
                        token={token}
                        user={user}
                        profile={profile}
                        onUserChange={onUserChange}
                    />

                    <SecurityCard token={token} />

                    <NotificationsCard token={token} initial={notifications} />
                </section>
            )}
        </div>
    )
}