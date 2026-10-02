import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { initials } from '../lib/format'
import type { MissingToday, User } from '../lib/types'
import { Avatar } from './Avatar'

const names = (users: User[]) => users.map(u => u.full_name).join(', ')

export function MissingTodayCard({
    token,
    reloadKey,
}: {
    token: string
    reloadKey: number
}) {
    const [data, setData] = useState<MissingToday | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        const load = () =>
            api<MissingToday>('/attendance/missing-today', {}, token)
                .then(result => {
                    setData(result)
                    setError('')
                })
                .catch(e =>
                    setError(
                        e instanceof Error ? e.message : 'No se pudo cargar la información.'
                    )
                )

        load()
        const id = setInterval(load, 60_000)
        return () => clearInterval(id)
    }, [token, reloadKey])

    return (
        <section className="dashboard-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">ASISTENCIA</p>
                    <h2>Sin registrar hoy</h2>
                </div>

                <span className="dashboard-card-icon">
                    {data?.is_workday ? data.missing.length : '–'}
                </span>
            </div>

            {error && <p className="error">{error}</p>}

            {!data ? (
                !error && <p className="empty">Cargando…</p>
            ) : !data.is_workday ? (
                <p className="pending-request-empty">Hoy no es día laborable.</p>
            ) : (
                <>
                    {!data.limit_passed && (
                        <p className="notice">
                            Aún dentro del horario de tolerancia (hasta las {data.late_limit}).
                        </p>
                    )}

                    {data.missing.length === 0 ? (
                        <p className="pending-request-empty">
                            Todo el equipo está al día: ya registró entrada o tiene
                            vacaciones o permiso.
                        </p>
                    ) : (
                        <div className="person-list">
                            {data.missing.map(person => (
                                <div className="person-item" key={person.id}>
                                    <Avatar user={person} className="profile-avatar" />

                                    <div>
                                        <strong>{person.full_name}</strong>
                                        <span>{person.email}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {(data.on_vacation.length > 0 || data.on_permission.length > 0) && (
                        <div className="absent-summary">
                            {data.on_vacation.length > 0 && (
                                <span>🏖️ De vacaciones: {names(data.on_vacation)}</span>
                            )}
                            {data.on_permission.length > 0 && (
                                <span>📝 Con permiso: {names(data.on_permission)}</span>
                            )}
                        </div>
                    )}
                </>
            )}
        </section>
    )
}