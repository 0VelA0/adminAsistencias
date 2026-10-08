import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

type ToastItem = { id: number; kind: 'ok' | 'error'; text: string }

type ToastApi = {
    success: (text: string) => void
    error: (text: string) => void
}

const ToastContext = createContext<ToastApi>({
    success: () => undefined,
    error: () => undefined,
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

            <div className="toast-stack" role="status" aria-live="polite">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast ${toast.kind}`}>
                        {toast.text}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export const useToast = () => useContext(ToastContext)