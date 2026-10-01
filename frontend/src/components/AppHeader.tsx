import { useEffect, useState } from 'react'
import type { User } from '../lib/types'

export function AppHeader({
    user,
    adminView,
    onToggleAdmin,
}: {
    user: User
    adminView: boolean
    onToggleAdmin: () => void
}) {
    const [now, setNow] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    const time = new Intl.DateTimeFormat(
        'es-MX',
        {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        }
    ).format(now)

    const date = new Intl.DateTimeFormat(
        'es-MX',
        {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }
    ).format(now)

    return (
        <header className="dashboard-header">

            <div className="dashboard-welcome">

                <p className="eyebrow">
                    PANEL DE CONTROL
                </p>

                <h1>
                    ¡Hola, {user.full_name}!
                </h1>

                <p className="muted">
                    Aquí tienes un resumen de tu actividad.
                </p>

            </div>


            <div className="dashboard-header-right">

                <div className="dashboard-clock">

                    <strong>
                        {time}
                    </strong>

                    <span>
                        {date}
                    </span>

                </div>


                <div className="dashboard-user">

                    <div className="dashboard-avatar">
                        {user.full_name
                            .charAt(0)
                            .toUpperCase()}
                    </div>

                    <div>
                        <strong>
                            {user.full_name}
                        </strong>

                        <span>
                            {user.role === 'admin'
                                ? 'Administrador'
                                : 'Empleado'}
                        </span>
                    </div>

                </div>


                {user.role === 'admin' && (
                    <button
                        className="secondary compact"
                        onClick={onToggleAdmin}
                    >
                        {adminView
                            ? 'Mi asistencia'
                            : 'Panel administrativo'}
                    </button>
                )}

            </div>

        </header>
    )
}