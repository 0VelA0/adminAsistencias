import { useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react'
import { createPortal } from 'react-dom'
import { api } from '../lib/api'
import { useBranding } from '../lib/branding'
import { parseServerDate, ymd } from '../lib/format'
import type { AttendanceToday, Page, User, Person } from '../lib/types'
import { ActionMenu } from './ActionMenu'
import type { MenuItem } from './ActionMenu'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { Logo } from './Login/Logo'
import { useAppEvent } from '../lib/events'
import { useCoalesced } from '../lib/useCoalesced'
import { useAsync } from '../lib/useAsync'
import { SidebarAccount } from './SidebarAccount'


type Item = { page: Page; icon: IconName; label: string }
type Group = { label: string; items: Item[] }

const EMPLOYEE_GROUPS: Group[] = [
  {
    label: 'Mi trabajo',
    items: [
      { page: 'dashboard', icon: 'home', label: 'Dashboard' },
      { page: 'attendance', icon: 'clock', label: 'Asistencia' },
      { page: 'vacations', icon: 'sun', label: 'Vacaciones' },
      { page: 'history', icon: 'history', label: 'Historial' },
    ],
  },
  {
    label: 'Empresa',
    items: [
      { page: 'news', icon: 'megaphone', label: 'Comunicados' },
      { page: 'calendar', icon: 'calendar', label: 'Calendario' },
      { page: 'team', icon: 'org', label: 'Equipo' },
      { page: 'spaces', icon: 'building', label: 'Espacios' },
    ],
  },
  { label: 'Cuenta', items: [{ page: 'settings', icon: 'sliders', label: 'Configuración' }] },
]

const ADMIN_GROUPS: Group[] = [
  {
    label: 'Gestión',
    items: [
      { page: 'admin-home', icon: 'home', label: 'Resumen' },
      { page: 'admin-requests', icon: 'clipboard', label: 'Solicitudes' },
      { page: 'admin-attendance', icon: 'clock', label: 'Asistencia' },
      { page: 'admin-reports', icon: 'download', label: 'Reportes' },
    ],
  },
  {
    label: 'Empresa',
    items: [
      { page: 'news', icon: 'megaphone', label: 'Comunicados' },
      { page: 'calendar', icon: 'calendar', label: 'Calendario' },
      { page: 'team', icon: 'org', label: 'Equipo' },
      { page: 'admin-spaces', icon: 'building', label: 'Espacios' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { page: 'users', icon: 'users', label: 'Usuarios' },
      { page: 'admin-holidays', icon: 'calendar', label: 'Festivos' },
    ],
  },
  { label: 'Cuenta', items: [{ page: 'settings', icon: 'sliders', label: 'Configuración' }] },
]

const MIN_ITEM_WIDTH = 68

const hhmm = (value: string) =>
  parseServerDate(value).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

/** Contadores: comunicados sin confirmar y, para el admin, solicitudes pendientes. */
function useNavBadges(token: string, user: User, adminView: boolean) {
  const [badges, setBadges] = useState<Partial<Record<Page, number>>>({})

  const load = useCoalesced(async () => {
    const next: Partial<Record<Page, number>> = {}

    try {
      next.news = (await api<{ count: number }>('/posts/unseen-count', {}, token)).count
    } catch {
      /* sin contador si falla */
    }

    if (adminView && user.role === 'admin') {
      try {
        const [vacations, permissions] = await Promise.all([
          api<{ status: string }[]>('/vacations/requests', {}, token),
          api<{ status: string }[]>('/permissions/requests', {}, token),
        ])

        next['admin-requests'] = [...vacations, ...permissions].filter(r => r.status === 'pending').length
      } catch {
        /* sin contador si falla */
      }
    }

    setBadges(next)
  }, )

  useAppEvent('requests:changed', load)
  useAppEvent('posts:changed', load)

  useEffect(() => {
    load()

    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 30_000)

    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  return badges
}

function TodayChip({ today, onOpen }: { today: AttendanceToday; onOpen: () => void }) {
  const lastBreak = today.breaks[today.breaks.length - 1]

  const state = today.is_on_vacation
    ? { tone: 'vacation', title: 'De vacaciones', detail: 'Disfruta tu día' }
    : !today.entry
      ? {
          tone: 'idle',
          title: 'Jornada sin iniciar',
          detail: today.requires_location ? 'Registro en oficina' : 'Registro remoto',
        }
      : today.exit
        ? { tone: 'done', title: 'Jornada terminada', detail: `Salida ${hhmm(today.exit.recorded_at)}` }
        : today.on_break && lastBreak
          ? { tone: 'paused', title: 'En pausa', detail: `Desde ${hhmm(lastBreak.started_at)}` }
          : { tone: 'working', title: 'Jornada en curso', detail: `Desde ${hhmm(today.entry.recorded_at)}` }

  return (
    <button
      type="button"
      className={`today-chip ${state.tone}`}
      data-tip={`${state.title} · ${state.detail}`}
      aria-label={`${state.title}, ${state.detail}. Ir a Asistencia`}
      onClick={onOpen}
    >
      <span className="today-dot" />
      <span className="today-text">
        <strong>{state.title}</strong>
        <small>{state.detail}</small>
      </span>
    </button>
  )
}

export function AppSidebar({
  user,
  token,
  today,
  activePage,
  adminView,
  collapsed,
  onToggleCollapsed,
  onPageChange,
  onToggleAdmin,
  onLogout,
}: {
  user: User
  token: string
  today: AttendanceToday | null
  activePage: Page
  adminView: boolean
  collapsed: boolean
  onToggleCollapsed: () => void
  onPageChange: (page: Page) => void
  onToggleAdmin: () => void
  onLogout: () => void
}) {
  const { branding } = useBranding()
  const badges = useNavBadges(token, user, adminView)

  const groups = adminView ? ADMIN_GROUPS : EMPLOYEE_GROUPS
  const items = groups.flatMap(g => g.items)

  const navRef = useRef<HTMLElement>(null)
  const itemRefs = useRef(new Map<Page, HTMLButtonElement>())

  const [capacity, setCapacity] = useState(items.length)
  const [moreOpen, setMoreOpen] = useState(false)
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null)
  const [tip, setTip] = useState<{ text: string; top: number } | null>(null)
  const people = useAsync(() => api<Person[]>('/people', {}, token), [token])
  const position = people.data?.find(p => p.id === user.id)?.position

  const roleLabel = user.role === 'admin' ? 'Administrador' : position || 'Empleado'

  // ---------- Barra inferior del celular: solo lo que cabe ----------
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
  const visiblePages = new Set((needsMore ? items.slice(0, capacity - 1) : items).map(i => i.page))
  const extras = items.filter(i => !visiblePages.has(i.page))

  // ---------- Indicador que se desliza a la opción activa ----------
  const placeIndicator = useCallback(() => {
    const el = itemRefs.current.get(activePage)
    setIndicator(el ? { top: el.offsetTop, height: el.offsetHeight } : null)
  }, [activePage])

  useLayoutEffect(() => {
    placeIndicator()
  }, [placeIndicator, collapsed, adminView, capacity])

  // ---------- Ctrl/Cmd + B: contraer o expandir ----------
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable]')

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b' && !typing) {
        event.preventDefault()
        onToggleCollapsed()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onToggleCollapsed])

  // ---------- Etiquetas flotantes con el menú contraído ----------
  const showTip = (event: React.SyntheticEvent) => {
    if (!collapsed) return

    const el = (event.target as HTMLElement).closest<HTMLElement>('[data-tip]')
    if (!el) return setTip(null)

    const rect = el.getBoundingClientRect()
    setTip({ text: el.dataset.tip ?? '', top: rect.top + rect.height / 2 })
  }

  useEffect(() => setTip(null), [collapsed, activePage])

  const go = (page: Page) => {
    setMoreOpen(false)
    onPageChange(page)
  }
  

  return (
    <aside
      className="sidebar"
      onMouseOver={showTip}
      onFocus={showTip}
      onMouseLeave={() => setTip(null)}
      onBlur={() => setTip(null)}
    >
      <div className="sidebar-brand">
        <Logo className="sidebar-logo" />

        <div className="sidebar-brand-text">
          <strong>{branding.company_name}</strong>
          <span>{adminView ? 'Administración' : 'Portal del empleado'}</span>
        </div>

        <button
          type="button"
          className="sidebar-collapse"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          data-tip="Expandir menú (Ctrl + B)"
        >
          <Icon name={collapsed ? 'right' : 'left'} size={16} />
        </button>
      </div>

      {!adminView && today && <TodayChip today={today} onOpen={() => go('attendance')} />}

      <nav className="sidebar-nav" ref={navRef} aria-label="Navegación principal">
        {indicator && (
          <span
            className="nav-indicator"
            aria-hidden="true"
            style={{ transform: `translateY(${indicator.top}px)`, height: indicator.height }}
          />
        )}

        {groups.map(group => {
          const shown = group.items.filter(item => visiblePages.has(item.page))
          if (!shown.length) return null

          return (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>

              {shown.map(item => {
                const badge = badges[item.page] ?? 0

                return (
                  <button
                    key={item.page}
                    ref={el => {
                      if (el) itemRefs.current.set(item.page, el)
                      else itemRefs.current.delete(item.page)
                    }}
                    className={activePage === item.page ? 'active' : ''}
                    aria-current={activePage === item.page ? 'page' : undefined}
                    aria-label={badge ? `${item.label}, ${badge} pendientes` : item.label}
                    data-tip={badge ? `${item.label} · ${badge}` : item.label}
                    onClick={() => go(item.page)}
                  >
                    <span className="nav-icon">
                      <Icon name={item.icon} />
                    </span>
                    <span className="nav-label">{item.label}</span>
                    {badge > 0 && <span className="nav-badge">{badge > 9 ? '9+' : badge}</span>}
                  </button>
                )
              })}
            </div>
          )
        })}

        {needsMore && (
          <button
            className={`nav-more-button ${extras.some(i => i.page === activePage) ? 'active' : ''}`}
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
        <SidebarAccount
          user={user}
          roleLabel={roleLabel}
          adminView={adminView}
          collapsed={collapsed}
          onProfile={() => go('settings')}
          onToggleAdmin={onToggleAdmin}
          onToggleCollapsed={onToggleCollapsed}
          onLogout={onLogout}
        />
      </div>

      {tip &&
        createPortal(
          <div className="sidebar-tooltip" role="tooltip" style={{ top: tip.top }}>
            {tip.text}
          </div>,
          document.body
        )}

      {moreOpen && (
        <div className="more-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" onClick={e => e.stopPropagation()}>
            {extras.map(item => (
              <button key={item.page} className={activePage === item.page ? 'active' : ''} onClick={() => go(item.page)}>
                <Icon name={item.icon} />
                {item.label}
                {(badges[item.page] ?? 0) > 0 && <span className="nav-badge">{badges[item.page]}</span>}
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