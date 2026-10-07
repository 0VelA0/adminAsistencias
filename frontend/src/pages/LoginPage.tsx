import { useState } from 'react'
import { api } from '../lib/api'
import { useBranding } from '../lib/branding'
import type { User } from '../lib/types'
import { Logo } from '../components/Logo'

export function LoginPage({
    onLogin,
}: {
    onLogin: (token: string, user: User) => void
}) {
    const { branding } = useBranding()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setLoading(true)
        setError('')

        try {
            const data = await api<{ access_token: string; user: User }>(
                '/auth/login',
                {
                    method: 'POST',
                    body: JSON.stringify({ email: email.trim(), password }),
                },
                ''
            )

            onLogin(data.access_token, data.user)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="login">
            <form className="login-card" onSubmit={submit}>
                <div className="login-brand">
                    <Logo className="login-logo" />
                    <h1>{branding.company_name}</h1>
                    <p className="muted">Control de asistencia</p>
                </div>

                <label>
                    Correo electrónico
                    <input
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </label>

                <label>
                    Contraseña
                    <input
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </label>

                {error && <p className="error">{error}</p>}

                <button type="submit" disabled={loading}>
                    {loading ? 'Entrando…' : 'Iniciar sesión'}
                </button>
            </form>
        </main>
    )
}