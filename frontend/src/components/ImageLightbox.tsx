import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

export function ImageLightbox({
    src,
    alt,
    onClose,
}: {
    src: string
    alt: string
    onClose: () => void
}) {
    const [zoomed, setZoomed] = useState(false)

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
        const previous = document.body.style.overflow

        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', onKey)

        return () => {
            document.body.style.overflow = previous
            window.removeEventListener('keydown', onKey)
        }
    }, [onClose])

    return createPortal(
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt || 'Imagen'} onClick={onClose}>
            <div className="lightbox-bar" onClick={e => e.stopPropagation()}>
                <span className="lightbox-title">{alt}</span>

                <div className="lightbox-actions">
                    <button
                        type="button"
                        className="lightbox-btn"
                        aria-label={zoomed ? 'Ajustar a la pantalla' : 'Ver a tamaño real'}
                        title={zoomed ? 'Ajustar a la pantalla' : 'Ver a tamaño real'}
                        onClick={() => setZoomed(z => !z)}
                    >
                        <Icon name={zoomed ? 'minus' : 'plus'} size={18} />
                    </button>

                    <a className="lightbox-btn" href={src} download="imagen-comunicado.jpg" aria-label="Descargar imagen" title="Descargar">
                        <Icon name="download" size={18} />
                    </a>

                    <button type="button" className="lightbox-btn" aria-label="Cerrar" title="Cerrar (Esc)" onClick={onClose}>
                        <Icon name="x" size={18} />
                    </button>
                </div>
            </div>

            <div className={`lightbox-stage ${zoomed ? 'zoomed' : ''}`}>
                <img
                    src={src}
                    alt={alt}
                    onClick={e => {
                        e.stopPropagation()
                        setZoomed(z => !z)
                    }}
                />
            </div>
        </div>,
        document.body
    )
}