import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { parseServerDate, timeAgo } from '../lib/format'
import type { AppNotification, NotificationsData, Page } from '../lib/types'
import { Icon } from './Icon'
import type { IconName } from './Icon'

const KIND_ICON: Record<string, IconName> = {
    missing_exit: 'alert',
    attendance_fix: 'clock',
    vacation: 'sun',
    permission: 'file',
    booking: 'building',
    weekly: 'trend',
    company: 'megaphone',
    meeting_reminder: 'clock',
    office_day: 'building',
}


export function NotificationBell({
    token,
    onNavigate,
}: {
    token: string
    onNavigate: (page: Page) => void
}) {
    const [open, setOpen] = useState(false)
    const [data, setData] = useState<NotificationsData>({ items: [], unread: 0 })
    const wrapRef = useRef<HTMLDivElement>(null)

    const load = useCallback(
        () => api<NotificationsData>('/notifications', {}, token).then(setData).catch(() => undefined),
        [token]
    )

    useEffect(() => {
        load()

        const id = setInterval(load, 60_000)
        window.addEventListener('focus', load)

        return () => {
            clearInterval(id)
            window.removeEventListener('focus', load)
        }
    }, [load])

    useEffect(() => {
        if (!open) return

        const close = (event: MouseEvent) => {
            if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
        }

        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [open])

    const openItem = async (item: AppNotification) => {
        setOpen(false)

        if (!item.read_at) {
            await api(`/notifications/${item.id}/read`, { method: 'POST' }, token).catch(() => undefined)
            load()
        }

        onNavigate(item.page)
    }

    const readAll = async () => {
        await api('/notifications/read-all', { method: 'POST' }, token).catch(() => undefined)
        load()
    }

    return (
        <div className="bell-wrap" ref={wrapRef}>
            <button
                type="button"
                className="secondary compact bell"
                aria-label={`Notificaciones${data.unread ? `, ${data.unread} sin leer` : ''}`}
                onClick={() => {
                    setOpen(o => !o)
                    load()
                }}
            >
                <Icon name="bell" size={18} />
                {data.unread > 0 && <span className="bell-badge">{data.unread > 9 ? '9+' : data.unread}</span>}
            </button>

            {open && (
                <div className="notif-panel">
                    <div className="notif-head">
                        <strong>Notificaciones</strong>

                        {data.unread > 0 && (
                            <button type="button" className="link" onClick={readAll}>
                                Marcar todas como leídas
                            </button>
                        )}
                    </div>

                    {data.items.length === 0 ? (
                        <p className="notif-empty">No tienes notificaciones.</p>
                    ) : (
                        <div className="notif-list">
                            {data.items.map(item => (
                                <button
                                    type="button"
                                    key={item.id}
                                    className={`notif-item ${item.read_at ? '' : 'unread'}`}
                                    onClick={() => openItem(item)}
                                >
                                    <span className={`notif-icon ${item.kind}`}>
                                        <Icon name={KIND_ICON[item.kind] ?? 'bell'} size={16} />
                                    </span>

                                    <span className="notif-text">
                                        <strong>{item.title}</strong>
                                        <span>{item.body}</span>
                                        <small>{timeAgo(item.created_at)}</small>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}