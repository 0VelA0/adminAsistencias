import { FormEvent, useState } from 'react'
import { api } from '../lib/api'
import type { User } from '../lib/types'

export function LoginPage({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [email, setEmail] = useState('usuario@integraprofesional.com'), [password, setPassword] = useState('PENEGORDO'), [error, setError] = useState(''), [loading, setLoading] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); setLoading(true); setError(''); try { const result = await api<{ access_token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); onLogin(result.access_token, result.user) } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión') } finally { setLoading(false) } }
  return <main className="login">
    <section className="card">
      <p className="eyebrow">INTEGRADORA PROFESIONAL</p>
      <h1>Control de asistencia</h1>
      <p className="muted">La sesión permanece en tu dispositivo para que no tengas que iniciar sesión cada día.</p>
      <form onSubmit={submit}>
        <label>
          Correo
          <input type="email" placeholder={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input type="password" placeholder={password} onChange={e => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button disabled={loading}>{loading ? 'Ingresando…' : 'Iniciar sesión'}</button>
        </form>
      </section>
    </main>
}
