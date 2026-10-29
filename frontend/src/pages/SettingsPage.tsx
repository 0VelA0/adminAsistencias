import { useState } from 'react'
import { api } from '../lib/api'
import { seniority } from '../lib/people'
import { useAsync } from '../lib/useAsync'
import type { NotificationSettings, Profile, User } from '../lib/types'
import { Avatar } from '../components/Avatar'
import { BrandingCard } from '../components/BrandingCard'
import { Icon } from '../components/Icon'
import type { IconName } from '../components/Icon'
import { NotificationsCard } from '../components/NotificationsCard'
import { ProfileCard } from '../components/ProfileCard'
import { SecurityCard } from '../components/SecurityCard'
import { StateView } from '../components/StatusBlocks'
import { AvatarUploader } from '../components/AvatarUploader'

type SectionKey = 'profile' | 'security' | 'notifications' | 'branding'

const SECTIONS: { key: SectionKey; label: string; description: string; icon: IconName; adminOnly?: boolean }[] = [
    { key: 'profile', label: 'Mi perfil', description: 'Tu foto, nombre y datos de contacto.', icon: 'user' },
    { key: 'security', label: 'Seguridad', description: 'Contraseña y acceso a tu cuenta.', icon: 'shield' },
    { key: 'notifications', label: 'Notificaciones', description: 'Elige qué avisos quieres recibir.', icon: 'bell' },
    {
        key: 'branding',
        label: 'Apariencia',
        description: 'Logo, nombre y colores de la empresa.',
        icon: 'palette',
        adminOnly: true,
    },
]

export function SettingsPage({
    token,
    user,
    onUserChange,
}: {
    token: string
    user: User
    onUserChange: (user: User) => void
}) {
    const isAdmin = user.role === 'admin'
    const sections = SECTIONS.filter(s => !s.adminOnly || isAdmin)
    const [section, setSection] = useState<SectionKey>('profile')
    const current = sections.find(s => s.key === section) ?? sections[0]

    const state = useAsync(async () => {
        const [profile, notifications] = await Promise.all([
            api<Profile>('/profile', {}, token),
            api<NotificationSettings>('/profile/notifications', {}, token),
        ])

        return { profile, notifications }
    }, [token])

    return (
        <div className="page-content">
            <section className="settings-hero">
                <div className="settings-cover" aria-hidden="true" />

                <div className="settings-identity">
                    <AvatarUploader token={token} user={user} onUserChange={onUserChange} size="xl" />

                    <div className="settings-who">
                        <h2>{user.full_name}</h2>
                        <p>{user.email}</p>

                        <div className="settings-tags">
                            <span className={`badge ${isAdmin ? 'admin' : 'employee'}`}>
                                {isAdmin ? 'Administrador' : 'Empleado'}
                            </span>

                            {user.hire_date && (
                                <span className="badge employee">En la empresa: {seniority(user.hire_date)}</span>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <div className="settings-layout">
                <nav className="settings-nav" aria-label="Secciones de configuración">
                    {sections.map(s => (
                        <button
                            key={s.key}
                            type="button"
                            className={section === s.key ? 'active' : ''}
                            aria-current={section === s.key ? 'page' : undefined}
                            onClick={() => setSection(s.key)}
                        >
                            <span className="settings-nav-icon">
                                <Icon name={s.icon} size={17} />
                            </span>

                            <span className="settings-nav-text">
                                <strong>{s.label}</strong>
                                <small>{s.description}</small>
                            </span>
                        </button>
                    ))}
                </nav>

                <div className="settings-panel" key={current.key}>
                    <header className="settings-panel-head">
                        <h3>{current.label}</h3>
                        <p className="muted">{current.description}</p>
                    </header>

                    <StateView state={state}>
                        {({ profile, notifications }) => (
                            <>
                                {current.key === 'profile' && (
                                    <ProfileCard token={token} user={user} profile={profile} onUserChange={onUserChange} />
                                )}

                                {current.key === 'security' && <SecurityCard token={token} />}

                                {current.key === 'notifications' && (
                                    <NotificationsCard token={token} initial={notifications} isAdmin={isAdmin} />
                                )}

                                {current.key === 'branding' && isAdmin && <BrandingCard token={token} />}
                            </>
                        )}
                    </StateView>
                </div>
            </div>
        </div>
    )
}