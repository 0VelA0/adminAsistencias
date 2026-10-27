import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import type { IconName } from './Icon'

export type MenuItem = {
    label: string
    hint?: string
    icon: IconName
    onSelect: () => void
    danger?: boolean
    disabled?: boolean
    dividerBefore?: boolean
}

const MENU_WIDTH = 240

export function ActionMenu({ items, label }: { items: MenuItem[]; label: string }) {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // Calcula la posición: abajo-derecha del botón, o arriba si no cabe
    useLayoutEffect(() => {
        if (!open) {
            setPos(null)
            return
        }

        const rect = buttonRef.current?.getBoundingClientRect()
        const height = menuRef.current?.offsetHeight ?? 0
        if (!rect) return

        const up = rect.bottom + height + 8 > window.innerHeight && rect.top > height + 8

        setPos({
            top: up ? rect.top - height - 6 : rect.bottom + 6,
            left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
            up,
        })

        menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    }, [open])

    useEffect(() => {
        if (!open) return

        const close = () => setOpen(false)

        const outside = (event: MouseEvent) => {
            const target = event.target as Node
            if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close()
        }

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                close()
                buttonRef.current?.focus()
            }
        }

        document.addEventListener('mousedown', outside)
        window.addEventListener('keydown', onKey)
        window.addEventListener('resize', close)
        window.addEventListener('scroll', close, true)

        return () => {
            document.removeEventListener('mousedown', outside)
            window.removeEventListener('keydown', onKey)
            window.removeEventListener('resize', close)
            window.removeEventListener('scroll', close, true)
        }
    }, [open])

    const moveFocus = (event: React.KeyboardEvent) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

        event.preventDefault()
        const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
        const next = event.key === 'ArrowDown' ? index + 1 : index - 1

        buttons[(next + buttons.length) % buttons.length]?.focus()
    }

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                className={`menu-trigger ${open ? 'open' : ''}`}
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
            >
                <Icon name="more" size={18} />
            </button>

            {open &&
                createPortal(
                    <div
                        ref={menuRef}
                        role="menu"
                        className={`action-menu ${pos?.up ? 'up' : ''}`}
                        style={pos ? { top: pos.top, left: pos.left, width: MENU_WIDTH } : { visibility: 'hidden' }}
                        onKeyDown={moveFocus}
                    >
                        {items.map(item => (
                            <div key={item.label} role="none">
                                {item.dividerBefore && <hr />}

                                <button
                                    type="button"
                                    role="menuitem"
                                    disabled={item.disabled}
                                    className={item.danger ? 'danger-item' : ''}
                                    onClick={() => {
                                        setOpen(false)
                                        item.onSelect()
                                    }}
                                >
                                    <span className="menu-icon">
                                        <Icon name={item.icon} size={16} />
                                    </span>

                                    <span className="menu-text">
                                        <strong>{item.label}</strong>
                                        {item.hint && <small>{item.hint}</small>}
                                    </span>
                                </button>
                            </div>
                        ))}
                    </div>,
                    document.body
                )}
        </>
    )
}