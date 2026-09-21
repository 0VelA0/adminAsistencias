import type { User } from '../lib/types'

export function AppHeader({ user, adminView, onToggleAdmin, onLogout }: { user: User; adminView: boolean; onToggleAdmin: () => void; onLogout: () => void }) {
  return <header><div><p className="eyebrow">INTEGRADORA PROFESIONAL</p><h1>Hola, {user.full_name}</h1></div><div className="header-actions">{user.role === 'admin' && <button className="link" onClick={onToggleAdmin}>{adminView ? 'Mi asistencia' : 'Panel administrativo'}</button>}<button className="link" onClick={onLogout}>Cerrar sesión</button></div></header>
}
