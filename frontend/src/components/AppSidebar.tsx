import type { Page, User } from '../lib/types'
import { useBranding } from '../lib/branding'
import { Avatar } from './Avatar'
import { Logo } from './Logo'

type Item = { page: Page; icon: string; label: string }

const EMPLOYEE_ITEMS: Item[] = [
  { page: 'dashboard', icon: '⌂', label: 'Dashboard' },
  { page: 'attendance', icon: '◷', label: 'Asistencia' },
  { page: 'vacations', icon: '▣', label: 'Vacaciones' },
  { page: 'history', icon: '◴', label: 'Historial' },
  { page: 'settings', icon: '⚙', label: 'Configuración' },
]

const ADMIN_ITEMS: Item[] = [
  { page: 'admin-home', icon: '⌂', label: 'Resumen' },
  { page: 'admin-requests', icon: '✎', label: 'Solicitudes' },
  { page: 'admin-attendance', icon: '◷', label: 'Asistencia' },
  { page: 'users', icon: '☺', label: 'Usuarios' },
  { page: 'settings', icon: '⚙', label: 'Configuración' },
]

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
  const items = adminView ? ADMIN_ITEMS : EMPLOYEE_ITEMS

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Logo className="sidebar-logo" />

        <div className="sidebar-brand-text">
          <strong>{branding.company_name}</strong>
          {adminView && <span>Administración</span>}
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map(item => (
          <button
            key={item.page}
            className={activePage === item.page ? 'active' : ''}
            onClick={() => onPageChange(item.page)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {user.role === 'admin' && (
          <button className="sidebar-mode" onClick={onToggleAdmin}>
            <span className="nav-icon">⇄</span>
            {adminView ? 'Vista de empleado' : 'Panel administrativo'}
          </button>
        )}

        <div
          className="sidebar-user"
          role="button"
          tabIndex={0}
          title="Ir a mi perfil"
          onClick={() => onPageChange('settings')}
          onKeyDown={e => e.key === 'Enter' && onPageChange('settings')}
        >
          <Avatar user={user} size="md" />

          <div>
            <strong>{user.full_name}</strong>
            <span>{user.role === 'admin' ? 'Administrador' : 'Empleado'}</span>
          </div>
        </div>

        <button className="sidebar-logout" onClick={onLogout}>
          ↪ Cerrar sesión
        </button>
      </div>
    </aside>
  )
}