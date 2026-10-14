import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

type ToastItem = { id: number; kind: 'ok' | 'error'; text: string }

type ToastApi = {
    success: (text: string) => void
    error: (text: string) => void
}

const missingProvider = () =>
    console.warn('ToastProvider no está montado: los avisos no se mostrarán. Revisa main.tsx.')

const ToastContext = createContext<ToastApi>({
    success: missingProvider,
    error: missingProvider,
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([])
    const nextId = useRef(0)

    const push = useCallback((kind: ToastItem['kind'], text: string) => {
        const id = nextId.current++
        setToasts(items => [...items, { id, kind, text }])

        setTimeout(
            () => setToasts(items => items.filter(item => item.id !== id)),
            kind === 'ok' ? 3200 : 5000
        )
    }, [])

    const api = useMemo<ToastApi>(
        () => ({
            success: text => push('ok', text),
            error: text => push('error', text),
        }),
        [push]
    )

    return (
        <ToastContext.Provider value={api}>
            {children}

            {createPortal(
                <div className="toast-stack" role="status" aria-live="polite">
                    {toasts.map(toast => (
                        <div key={toast.id} className={`toast ${toast.kind}`}>
                            <span className="toast-icon">
                                <Icon name={toast.kind === 'ok' ? 'check' : 'alert'} size={13} />
                            </span>
                            <span>{toast.text}</span>
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    )
}

export const useToast = () => useContext(ToastContext)