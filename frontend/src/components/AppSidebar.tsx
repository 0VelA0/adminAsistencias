import type { User } from '../lib/types'

type Page =
  | 'dashboard'
  | 'attendance'
  | 'vacations'
  | 'history'
  | 'settings'

export function AppSidebar({
  user,
  activePage,
  onPageChange,
  onLogout,
}: {
  user: User
  activePage: Page
  onPageChange: (page: Page) => void
  onLogout: () => void
}) {
  return (
    <aside className="sidebar">

      {/* LOGO / EMPRESA */}
      <div className="sidebar-brand">
        <strong>
          INTEGRADORA
        </strong>

        <span>
          PROFESIONAL
        </span>
      </div>


      {/* NAVEGACIÓN */}
      <nav className="sidebar-nav">

        <button
          className={
            activePage === 'dashboard'
              ? 'active'
              : ''
          }
          onClick={() =>
            onPageChange('dashboard')
          }
        >
          <span>⌂</span>
          Dashboard
        </button>


        <button
          className={
            activePage === 'attendance'
              ? 'active'
              : ''
          }
          onClick={() =>
            onPageChange('attendance')
          }
        >
          <span>◷</span>
          Asistencia
        </button>


        <button
          className={
            activePage === 'vacations'
              ? 'active'
              : ''
          }
          onClick={() =>
            onPageChange('vacations')
          }
        >
          <span>▣</span>
          Vacaciones
        </button>


        <button
          className={
            activePage === 'history'
              ? 'active'
              : ''
          }
          onClick={() =>
            onPageChange('history')
          }
        >
          <span>◴</span>
          Historial
        </button>


        <button
          className={
            activePage === 'settings'
              ? 'active'
              : ''
          }
          onClick={() =>
            onPageChange('settings')
          }
        >
          <span>⚙</span>
          Configuración
        </button>

      </nav>


      {/* USUARIO */}
      <div className="sidebar-bottom">

        <div className="sidebar-user">

          <div className="sidebar-avatar">
            {user.full_name.charAt(0).toUpperCase()}
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


        <button
          className="sidebar-logout"
          onClick={onLogout}
        >
          ↪ Cerrar sesión
        </button>

      </div>

    </aside>
  )
}