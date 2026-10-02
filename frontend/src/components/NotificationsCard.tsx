import { useState } from 'react'
import { api } from '../lib/api'
import type { NotificationSettings } from '../lib/types'

const OPTIONS: { key: keyof NotificationSettings; label: string }[] = [
    { key: 'notify_attendance', label: 'Avisos de asistencia' },
    { key: 'notify_vacations', label: 'Estado de vacaciones' },
    { key: 'notify_permissions', label: 'Estado de permisos' },
    { key: 'notify_company', label: 'Novedades de la empresa' },
    { key: 'notify_weekly', label: 'Resumen semanal' },
]

export function NotificationsCard({
    token,
    initial,
}: {
    token: string
    initial: NotificationSettings
}) {
    const [values, setValues] = useState(initial)
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null)

    const save = async () => {
        setSaving(true)
        setStatus(null)

        try {
            const updated = await api<NotificationSettings>(
                '/profile/notifications',
                { method: 'PUT', body: JSON.stringify(values) },
                token
            )

            setValues(updated)
            setStatus({ text: 'Preferencias guardadas.', ok: true })
        } catch (error) {
            setStatus({
                text: error instanceof Error ? error.message : 'No se pudieron guardar.',
                ok: false,
            })
        } finally {
            setSaving(false)
        }
    }

    return (
        <article className="dashboard-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">AVISOS</p>
                    <h2>Notificaciones</h2>
                </div>
                <span className="dashboard-card-icon">🔔</span>
            </div>

            <div>
                {OPTIONS.map(option => (
                    <div className="switch-row" key={option.key}>
                        <span>{option.label}</span>

                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={values[option.key]}
                                onChange={e =>
                                    setValues(old => ({
                                        ...old,
                                        [option.key]: e.target.checked,
                                    }))
                                }
                            />
                            <span />
                        </label>
                    </div>
                ))}
            </div>

            {status && (
                <p className={status.ok ? 'notice' : 'error'}>{status.text}</p>
            )}

            <button
                type="button"
                className="compact settings-save"
                disabled={saving}
                onClick={save}
            >
                {saving ? 'Guardando…' : 'Guardar notificaciones'}
            </button>
        </article>
    )
}