import { useState } from 'react'
import { api } from '../lib/api'
import type { NotificationSettings } from '../lib/types'
import { Icon } from './Icon'
import { useToast } from './Toast'

const OPTIONS: { key: keyof NotificationSettings; label: string; hint: string }[] = [
    { key: 'notify_attendance', label: 'Avisos de asistencia', hint: 'Salida sin registrar' },
    { key: 'notify_vacations', label: 'Vacaciones', hint: 'Respuestas y nuevas solicitudes' },
    { key: 'notify_permissions', label: 'Permisos', hint: 'Respuestas y nuevas solicitudes' },
    { key: 'notify_company', label: 'Novedades de la empresa', hint: 'Próximamente' },
    { key: 'notify_weekly', label: 'Resumen semanal', hint: 'Próximamente' },
]

export function NotificationsCard({ token, initial, isAdmin }: { token: string; initial: NotificationSettings; isAdmin: boolean }) {
    const toast = useToast()
    const [values, setValues] = useState(initial)
    const [saving, setSaving] = useState(false)

    const save = async () => {
        setSaving(true)

        try {
            setValues(
                await api<NotificationSettings>(
                    '/profile/notifications',
                    { method: 'PUT', body: JSON.stringify(values) },
                    token
                )
            )
            toast.success('Preferencias de notificaciones guardadas.')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudieron guardar.')
        } finally {
            setSaving(false)
        }
    }

    const OPTIONS = (isAdmin: boolean) => [
        { key: 'notify_attendance', label: 'Avisos de asistencia', hint: 'Salida sin registrar y correcciones de un administrador' },
        { key: 'notify_vacations', label: 'Vacaciones', hint: isAdmin ? 'Respuestas y nuevas solicitudes del equipo' : 'Respuestas a tus solicitudes' },
        { key: 'notify_permissions', label: 'Permisos', hint: isAdmin ? 'Respuestas y nuevas solicitudes del equipo' : 'Respuestas a tus solicitudes' },
        { key: 'notify_company', label: 'Novedades de la empresa', hint: 'Comunicados y reuniones (próximamente)' },
        { key: 'notify_weekly', label: 'Resumen semanal', hint: 'Cada lunes, el resumen de tu semana' },
    ] as const satisfies readonly { key: keyof NotificationSettings; label: string; hint: string }[]

    return (
        <article className="dashboard-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">AVISOS</p>
                    <h2>Notificaciones</h2>
                </div>
                <span className="dashboard-card-icon">
                    <Icon name="bell" />
                </span>
            </div>

            <div>
                {OPTIONS(isAdmin).map(option => (
                    <div className="switch-row" key={option.key}>
                        <div className="switch-text">
                            <span>{option.label}</span>
                            <small>{option.hint}</small>
                        </div>

                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={values[option.key]}
                                onChange={e => setValues(old => ({ ...old, [option.key]: e.target.checked }))}
                            />
                            <span />
                        </label>
                    </div>
                ))}
            </div>

            <button type="button" className="compact settings-save" disabled={saving} onClick={save}>
                {saving ? 'Guardando…' : 'Guardar notificaciones'}
            </button>
        </article>
    )
}