import { useEffect, useState } from 'react'
import type { User } from '../lib/types'
import { Avatar } from './Avatar'
import { Logo } from './Logo'

export function AppHeader({
    user,
    adminView,
    onToggleAdmin,
    onProfileClick,
    onLogout,
}: {
    user: User
    adminView: boolean
    onToggleAdmin: () => void
    onProfileClick: () => void
    onLogout: () => void
}) {
    const [now, setNow] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const time = new Intl.DateTimeFormat('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(now)

    const date = new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(now)

    return (
        <header className="dashboard-header">
            <div className="dashboard-brand">
                <Logo className="header-logo" />

                <div className="dashboard-welcome">
                    <p className="eyebrow">
                        {adminView ? 'PANEL ADMINISTRATIVO' : 'PANEL DE CONTROL'}
                    </p>

                    <h1>¡Hola, {user.full_name}!</h1>

                    <p className="muted">
                        {adminView
                            ? 'Gestiona al equipo, sus solicitudes y sus registros.'
                            : 'Aquí tienes un resumen de tu actividad.'}
                    </p>
                </div>
            </div>

            <div className="dashboard-header-right">
                <div className="dashboard-clock">
                    <strong>{time}</strong>
                    <span>{date}</span>
                </div>

                <div
                    className="dashboard-user"
                    role="button"
                    tabIndex={0}
                    title="Ir a mi perfil"
                    onClick={onProfileClick}
                    onKeyDown={e => e.key === 'Enter' && onProfileClick()}
                >
                    <Avatar user={user} size="sm" />

                    <div>
                        <strong>{user.full_name}</strong>
                        <span>{user.role === 'admin' ? 'Administrador' : 'Empleado'}</span>
                    </div>
                </div>

                {user.role === 'admin' && (
                    <button className="secondary compact header-toggle" onClick={onToggleAdmin}>
                        <span className="toggle-icon">⇄</span>
                        <span className="toggle-text">
                            {adminView ? 'Mi asistencia' : 'Panel administrativo'}
                        </span>
                    </button>
                )}

                <button
                    className="secondary compact header-logout"
                    onClick={onLogout}
                    aria-label="Cerrar sesión"
                >
                    ↪
                </button>
            </div>
        </header>
    )
}