import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { NotificationSettings, Profile, User } from '../lib/types'
import { ProfileCard } from '../components/ProfileCard'
import { NotificationsCard } from '../components/NotificationsCard'
import { SecurityCard } from '../components/SecurityCard'
import { BrandingCard } from '../components/BrandingCard'
import { useAsync } from '../lib/useAsync'
import { StateView } from '../components/StatusBlocks'

export function SettingsPage({
    token,
    user,
    onUserChange,
}: {
    token: string
    user: User
    onUserChange: (user: User) => void
}) {
    const state = useAsync(async () => {
        const [profile, notifications] = await Promise.all([
            api<Profile>('/profile', {}, token),
            api<NotificationSettings>('/profile/notifications', {}, token),
        ])

        return { profile, notifications }
    }, [token])

    return (
        <div className="page-content">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">CONFIGURACIÓN</p>
                    <h2>Panel de Configuración</h2>
                    <p className="muted">Gestiona tu perfil, notificaciones y seguridad.</p>
                </div>

            </div>

            {/*error && <p className="error">{error}</p>*/}

            <StateView state={state}>
                {({ profile, notifications }) => (
                    <section className="settings-grid">
                        <ProfileCard token={token} user={user} profile={profile} onUserChange={onUserChange} />
                        <SecurityCard token={token} />
                        <NotificationsCard token={token} initial={notifications} />
                        {user.role === 'admin' && <BrandingCard token={token} />}
                    </section>
                )}
            </StateView>
        </div>
    )
}