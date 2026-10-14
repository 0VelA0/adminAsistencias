import { useEffect, useRef, useState } from 'react'

import type { Page, User } from '../lib/types'
import { useBranding } from '../lib/branding'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { Logo } from './Login/Logo'

type Item = { page: Page; icon: IconName; label: string }

const EMPLOYEE_ITEMS: Item[] = [
  { page: 'dashboard', icon: 'home', label: 'Dashboard' },
  { page: 'attendance', icon: 'clock', label: 'Asistencia' },
  { page: 'vacations', icon: 'sun', label: 'Vacaciones' },
  { page: 'history', icon: 'history', label: 'Historial' },
  { page: 'spaces', icon: 'building', label: 'Espacios' },
  { page: 'settings', icon: 'sliders', label: 'Configuración' },
]

const ADMIN_ITEMS: Item[] = [
  { page: 'admin-home', icon: 'home', label: 'Resumen' },
  { page: 'admin-requests', icon: 'clipboard', label: 'Solicitudes' },
  { page: 'admin-attendance', icon: 'clock', label: 'Asistencia' },
  { page: 'admin-spaces', icon: 'building', label: 'Espacios' },
  { page: 'users', icon: 'users', label: 'Usuarios' },
  { page: 'settings', icon: 'sliders', label: 'Configuración' },
  { page: 'admin-holidays', icon: 'calendar', label: 'Días festivos' },
]

const MOBILE_SLOTS = 5

const MIN_ITEM_WIDTH = 68

export function AppSidebar({
  user,
  activePage,
  adminView,
  onPageChange,
  onToggleAdmin,
  onLogout,
}: {
  user: User
  activePage: Page
  adminView: boolean
  onPageChange: (page: Page) => void
  onToggleAdmin: () => void
  onLogout: () => void
}) {
  const { branding } = useBranding()
  const [moreOpen, setMoreOpen] = useState(false)

  const navRef = useRef<HTMLElement>(null)
  const items = adminView ? ADMIN_ITEMS : EMPLOYEE_ITEMS
  const [capacity, setCapacity] = useState(items.length)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    const measure = () => {
      const isBar = window.matchMedia('(max-width: 760px)').matches
      setCapacity(isBar ? Math.max(3, Math.floor(nav.clientWidth / MIN_ITEM_WIDTH)) : items.length)
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(nav)

    return () => observer.disconnect()
  }, [items.length])

  const needsMore = items.length > capacity
  const visible = needsMore ? items.slice(0, capacity - 1) : items
  const extras = needsMore ? items.slice(capacity - 1) : []

  const go = (page: Page) => {
    setMoreOpen(false)
    onPageChange(page)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Logo className="sidebar-logo" />

        <div className="sidebar-brand-text">
          <strong>{branding.company_name}</strong>
          {adminView && <span>Administración</span>}
        </div>
      </div>

      <nav className="sidebar-nav" ref={navRef}>
        {visible.map(item => (
          <button
            key={item.page}
            className={activePage === item.page ? 'active' : ''}
            onClick={() => go(item.page)}
          >
            <span className="nav-icon">
              <Icon name={item.icon} />
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}

        {needsMore && (
          <button
            className={extras.some(i => i.page === activePage) ? 'active' : ''}
            onClick={() => setMoreOpen(open => !open)}
          >
            <span className="nav-icon">
              <Icon name="more" />
            </span>
            <span className="nav-label">Más</span>
          </button>
        )}
      </nav>

      <div className="sidebar-bottom">
        {user.role === 'admin' && (
          <button className="sidebar-mode" onClick={onToggleAdmin}>
            <span className="nav-icon">
              <Icon name="switch" size={16} />
            </span>
            {adminView ? 'Vista de empleado' : 'Panel administrativo'}
          </button>
        )}

        <div
          className="sidebar-user"
          role="button"
          tabIndex={0}
          title="Ir a mi perfil"
          onClick={() => go('settings')}
          onKeyDown={e => e.key === 'Enter' && go('settings')}
        >
          <Avatar user={user} size="md" />

          <div>
            <strong>{user.full_name}</strong>
            <span>{user.role === 'admin' ? 'Administrador' : 'Empleado'}</span>
          </div>
        </div>

        <button className="sidebar-logout" onClick={onLogout}>
          <span className="nav-icon">
            <Icon name="logout" size={16} />
          </span>
          Cerrar sesión
        </button>
      </div>

      {moreOpen && (
        <div className="more-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" onClick={e => e.stopPropagation()}>
            {extras.map(item => (
              <button
                key={item.page}
                className={activePage === item.page ? 'active' : ''}
                onClick={() => go(item.page)}
              >
                <Icon name={item.icon} />
                {item.label}
              </button>
            ))}

            {user.role === 'admin' && (
              <button
                onClick={() => {
                  setMoreOpen(false)
                  onToggleAdmin()
                }}
              >
                <Icon name="switch" />
                {adminView ? 'Vista de empleado' : 'Panel administrativo'}
              </button>
            )}

            <button onClick={onLogout}>
              <Icon name="logout" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}