import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { timeAgo } from '../lib/format'
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

const SWIPE_DISMISS = 90 // píxeles hacia la izquierda para borrar

function NotificationRow({
    item,
    onOpen,
    onDismiss,
}: {
    item: AppNotification
    onOpen: (item: AppNotification) => void
    onDismiss: (item: AppNotification) => void
}) {
    const [dx, setDx] = useState(0)
    const [dragging, setDragging] = useState(false)
    const [leaving, setLeaving] = useState(false)
    const startX = useRef<number | null>(null)
    const moved = useRef(false)

    const dismiss = () => {
        setLeaving(true)
        setDx(-420)
        setTimeout(() => onDismiss(item), 240)
    }

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        startX.current = event.clientX
        moved.current = false
        event.currentTarget.setPointerCapture(event.pointerId)
    }

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (startX.current === null) return

        const delta = Math.min(0, event.clientX - startX.current)

        if (Math.abs(delta) > 8) {
            moved.current = true
            setDragging(true)
        }

        if (moved.current) setDx(delta)
    }

    const onPointerUp = () => {
        if (startX.current === null) return

        startX.current = null
        setDragging(false)

        if (dx < -SWIPE_DISMISS) dismiss()
        else setDx(0)
    }

    return (
        <div className={`notif-swipe ${leaving ? 'leaving' : ''}`}>
            <div className="notif-swipe-bg" aria-hidden="true">
                <Icon name="trash" size={16} /> Borrar
            </div>

            <div
                role="button"
                tabIndex={0}
                className={`notif-item ${item.read_at ? '' : 'unread'}`}
                style={{ transform: `translateX(${dx}px)`, transition: dragging ? 'none' : undefined }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClick={() => {
                    if (!moved.current) onOpen(item)
                }}
                onKeyDown={e => {
                    if (e.key === 'Enter') onOpen(item)
                    if (e.key === 'Delete' || e.key === 'Backspace') dismiss()
                }}
            >
                <span className={`notif-icon ${item.kind}`}>
                    <Icon name={KIND_ICON[item.kind] ?? 'bell'} size={16} />
                </span>

                <span className="notif-text">
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                    <small>{timeAgo(item.created_at)}</small>
                </span>

                <button
                    type="button"
                    className="notif-delete"
                    aria-label="Borrar notificación"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => {
                        e.stopPropagation()
                        dismiss()
                    }}
                >
                    <Icon name="x" size={14} />
                </button>
            </div>
        </div>
    )
}

export function NotificationBell({ token, onNavigate }: { token: string; onNavigate: (page: Page) => void }) {
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

    // Se quita de la lista al momento; si el servidor falla, se recarga
    const dismiss = (item: AppNotification) => {
        setData(current => ({
            items: current.items.filter(n => n.id !== item.id),
            unread: current.unread - (item.read_at ? 0 : 1),
        }))

        api(`/notifications/${item.id}`, { method: 'DELETE' }, token).catch(load)
    }

    const readAll = async () => {
        await api('/notifications/read-all', { method: 'POST' }, token).catch(() => undefined)
        load()
    }

    const clearAll = async () => {
        if (!window.confirm('¿Borrar todas tus notificaciones?')) return

        setData({ items: [], unread: 0 })
        await api('/notifications', { method: 'DELETE' }, token).catch(load)
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

                        <div className="notif-head-actions">
                            {data.unread > 0 && (
                                <button type="button" className="link" onClick={readAll}>
                                    Marcar leídas
                                </button>
                            )}

                            {data.items.length > 0 && (
                                <button type="button" className="link danger-link" onClick={clearAll}>
                                    Borrar todas
                                </button>
                            )}
                        </div>
                    </div>

                    {data.items.length === 0 ? (
                        <div className="notif-empty">
                            <Icon name="bell" size={22} />
                            <p>Estás al día. No tienes notificaciones.</p>
                        </div>
                    ) : (
                        <div className="notif-list">
                            {data.items.map(item => (
                                <NotificationRow key={item.id} item={item} onOpen={openItem} onDismiss={dismiss} />
                            ))}
                        </div>
                    )}

                    {data.items.length > 0 && (
                        <p className="notif-tip">Desliza a la izquierda o usa × para borrar una notificación.</p>
                    )}
                </div>
            )}
        </div>
    )
}