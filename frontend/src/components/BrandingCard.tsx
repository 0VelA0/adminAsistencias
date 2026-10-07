import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { DEFAULT_BRANDING, applyTheme, useBranding } from '../lib/branding'
import { fileToLogo } from '../lib/image'
import type { Branding } from '../lib/types'
import { Logo } from './Logo'

export function BrandingCard({ token }: { token: string }) {
    const { branding, setBranding } = useBranding()

    const [name, setName] = useState(branding.company_name)
    const [primary, setPrimary] = useState(branding.primary_color)
    const [sidebar, setSidebar] = useState(branding.sidebar_color)
    const [busy, setBusy] = useState(false)
    const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null)

    const fileRef = useRef<HTMLInputElement>(null)
    const saved = useRef(branding)
    saved.current = branding

    useEffect(() => {
        applyTheme({ primary_color: primary, sidebar_color: sidebar })
    }, [primary, sidebar])

    useEffect(() => () => applyTheme(saved.current), [])

    const fail = (error: unknown, fallback: string) =>
        setStatus({ text: error instanceof Error ? error.message : fallback, ok: false })

    const save = async (event: React.FormEvent) => {
        event.preventDefault()
        setBusy(true)
        setStatus(null)

        try {
            const updated = await api<Branding>(
                '/branding',
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        company_name: name.trim(),
                        primary_color: primary,
                        sidebar_color: sidebar,
                    }),
                },
                token
            )

            setBranding(updated)
            setStatus({ text: 'Apariencia guardada.', ok: true })
        } catch (error) {
            fail(error, 'No se pudo guardar.')
        } finally {
            setBusy(false)
        }
    }

    const changeLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return

        setBusy(true)
        setStatus(null)

        try {
            const logo = await fileToLogo(file)

            setBranding(
                await api<Branding>(
                    '/branding/logo',
                    { method: 'PUT', body: JSON.stringify({ avatar: logo }) },
                    token
                )
            )

            setStatus({ text: 'Logo actualizado.', ok: true })
        } catch (error) {
            fail(error, 'No se pudo cambiar el logo.')
        } finally {
            setBusy(false)
        }
    }

    const removeLogo = async () => {
        setBusy(true)
        setStatus(null)

        try {
            setBranding(await api<Branding>('/branding/logo', { method: 'DELETE' }, token))
            setStatus({ text: 'Logo restablecido.', ok: true })
        } catch (error) {
            fail(error, 'No se pudo quitar el logo.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <article className="dashboard-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">ADMINISTRADOR</p>
                    <h2>Apariencia de la empresa</h2>
                </div>
                <span className="dashboard-card-icon">🎨</span>
            </div>

            <form className="settings-form" onSubmit={save}>
                <div className="logo-row">
                    <div className="logo-preview">
                        <Logo />
                    </div>

                    <div className="avatar-actions">
                        <button
                            type="button"
                            className="secondary compact"
                            disabled={busy}
                            onClick={() => fileRef.current?.click()}
                        >
                            Cambiar logo
                        </button>

                        {branding.logo && (
                            <button
                                type="button"
                                className="secondary compact"
                                disabled={busy}
                                onClick={removeLogo}
                            >
                                Quitar
                            </button>
                        )}

                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            hidden
                            onChange={changeLogo}
                        />
                    </div>
                </div>

                <label>
                    Nombre de la empresa
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        minLength={2}
                        maxLength={120}
                        required
                    />
                </label>

                <div className="color-grid">
                    <label className="color-field">
                        Color principal
                        <input type="color" value={primary} onChange={e => setPrimary(e.target.value)} />
                    </label>

                    <label className="color-field">
                        Color del menú
                        <input type="color" value={sidebar} onChange={e => setSidebar(e.target.value)} />
                    </label>
                </div>

                <button
                    type="button"
                    className="link"
                    onClick={() => {
                        setPrimary(DEFAULT_BRANDING.primary_color)
                        setSidebar(DEFAULT_BRANDING.sidebar_color)
                    }}
                >
                    Restablecer colores
                </button>

                {status && <p className={status.ok ? 'notice' : 'error'}>{status.text}</p>}

                <button type="submit" className="compact" disabled={busy}>
                    {busy ? 'Guardando…' : 'Guardar apariencia'}
                </button>
            </form>
        </article>
    )
}