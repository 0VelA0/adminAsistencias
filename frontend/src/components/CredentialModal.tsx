import { useState } from 'react'

export function CredentialsModal({
    title,
    name,
    email,
    password,
    onClose,
}: {
    title: string
    name: string
    email: string
    password: string
    onClose: () => void
}) {
    const [copied, setCopied] = useState(false)

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(
                `Correo: ${email}\nContraseña temporal: ${password}`
            )
            setCopied(true)
        } catch {
            setCopied(false)
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <p className="eyebrow">USUARIOS</p>
                <h2>{title}</h2>

                <p className="muted">
                    Credenciales de <strong>{name}</strong>
                </p>

                <div className="credential-box">
                    <span>Correo</span>
                    <code>{email}</code>

                    <span>Contraseña temporal</span>
                    <code>{password}</code>
                </div>

                <p className="notice">
                    Compártela por un medio seguro. <strong>No se volverá a mostrar.</strong>{' '}
                    El usuario puede cambiarla en Configuración → Seguridad.
                </p>

                <div className="modal-actions">
                    <button type="button" className="secondary" onClick={copy}>
                        {copied ? 'Copiado ✓' : 'Copiar'}
                    </button>
                    <button type="button" onClick={onClose}>
                        Listo
                    </button>
                </div>
            </div>
        </div>
    )
}