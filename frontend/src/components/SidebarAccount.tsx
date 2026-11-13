import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { User } from '../lib/types'
import { Avatar } from './Avatar'
import { Icon } from './Icon'

export function SidebarAccount({
    user,
    roleLabel,
    adminView,
    collapsed,
    onProfile,
    onToggleAdmin,
    onToggleCollapsed,
    onLogout,
}: {
    user: User
    roleLabel: string
    adminView: boolean
    collapsed: boolean
    onProfile: () => void
    onToggleAdmin: () => void
    onToggleCollapsed: () => void
    onLogout: () => void
}) {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState<{ left: number; bottom: number; width: number } | null>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // El menú se abre hacia arriba, alineado con la tarjeta
    useLayoutEffect(() => {
        if (!open) return setPos(null)

        const rect = triggerRef.current?.getBoundingClientRect()
        if (!rect) return

        setPos({
            left: rect.left,
            bottom: window.innerHeight - rect.top + 8,
            width: Math.max(rect.width, 240),
        })
    }, [open, collapsed])

    useEffect(() => {
        if (!open) return

        const outside = (e: MouseEvent) => {
            const target = e.target as Node
            if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false)
        }

        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
        const close = () => setOpen(false)

        document.addEventListener('mousedown', outside)
        window.addEventListener('keydown', onKey)
        window.addEventListener('resize', close)

        return () => {
            document.removeEventListener('mousedown', outside)
            window.removeEventListener('keydown', onKey)
            window.removeEventListener('resize', close)
        }
    }, [open])

    const pick = (action: () => void) => () => {
        setOpen(false)
        action()
    }

    const isAdmin = user.role === 'admin'

    return (
        <div className={`sa ${collapsed ? 'is-collapsed' : ''}`}>
            {isAdmin && (
                <button
                    type="button"
                    className="sa-mode"
                    data-tip={adminView ? 'Vista de empleado' : 'Panel administrativo'}
                    onClick={onToggleAdmin}
                >
                    <Icon name="switch" size={16} />
                    <span className="sa-label">{adminView ? 'Vista de empleado' : 'Panel administrativo'}</span>
                </button>
            )}

            <button
                ref={triggerRef}
                type="button"
                className={`sa-card ${open ? 'open' : ''}`}
                aria-haspopup="menu"
                aria-expanded={open}
                data-tip={collapsed ? user.full_name : undefined}
                onClick={() => setOpen(o => !o)}
            >
                <span className="sa-avatar">
                    <Avatar user={user} size="md" />
                </span>

                <span className="sa-text">
                    <strong>{user.full_name}</strong>
                    <small>{roleLabel}</small>
                </span>
            </button>

            <button type="button" className="sa-logout" data-tip="Cerrar sesión" onClick={onLogout}>
                <Icon name="logout" size={16} />
                <span className="sa-label">Cerrar sesión</span>
            </button>

            {open &&
                createPortal(
                    <div
                        ref={menuRef}
                        role="menu"
                        className="sa-menu"
                        style={pos ? { left: pos.left, bottom: pos.bottom, width: pos.width } : { visibility: 'hidden' }}
                    >
                        <div className="sa-menu-head">
                            <Avatar user={user} size="sm" />
                            <div>
                                <strong>{user.full_name}</strong>
                                <span>{user.email}</span>
                            </div>
                        </div>

                        <button type="button" role="menuitem" onClick={pick(onProfile)}>
                            <Icon name="user" size={16} /> Mi perfil
                        </button>

                        <button type="button" role="menuitem" onClick={pick(onToggleCollapsed)}>
                            <Icon name={collapsed ? 'right' : 'left'} size={16} />
                            {collapsed ? 'Expandir menú' : 'Contraer menú'}
                            <kbd>Ctrl B</kbd>
                        </button>
                    </div>,
                    document.body
                )}
        </div>
    )
}