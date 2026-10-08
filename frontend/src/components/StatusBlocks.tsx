import type { AsyncState } from '../lib/useAsync'
import { Logo } from './Logo'

export function LoadingBlock({ text = 'Cargando información…' }: { text?: string }) {
    return (
        <div className="state-block" role="status" aria-live="polite">
            <span className="spinner" />
            <p>{text}</p>
        </div>
    )
}

export function ErrorBlock({
    message,
    onRetry,
}: {
    message?: string | null
    onRetry: () => void
}) {
    return (
        <div className="state-block" role="alert">
            <span className="state-icon">!</span>
            <strong>No pudimos cargar la información</strong>

            <p>
                Revisa tu conexión e inténtalo de nuevo. Si el problema continúa,
                recarga la página.
            </p>

            {message && <small>{message}</small>}

            <div className="state-actions">
                <button type="button" className="compact" onClick={onRetry}>
                    Reintentar
                </button>

                <button
                    type="button"
                    className="secondary compact"
                    onClick={() => window.location.reload()}
                >
                    Recargar página
                </button>
            </div>
        </div>
    )
}

export function StateView<T>({
    state,
    children,
}: {
    state: AsyncState<T>
    children: (data: T) => React.ReactNode
}) {
    if (state.data === null) {
        return state.error ? (
            <ErrorBlock message={state.error} onRetry={state.reload} />
        ) : (
            <LoadingBlock />
        )
    }

    return (
        <>
            {state.error && (
                <div className="state-inline" role="alert">
                    <span>No se pudo actualizar la información.</span>
                    <button type="button" className="secondary" onClick={state.reload}>
                        Reintentar
                    </button>
                </div>
            )}

            {children(state.data)}
        </>
    )
}

export function FullScreenStatus({
    error,
    onRetry,
}: {
    error: string
    onRetry: () => void
}) {
    return (
        <div className="fullscreen-status">
            <div>
                <Logo className="login-logo" />

                {error ? (
                    <ErrorBlock message={error} onRetry={onRetry} />
                ) : (
                    <LoadingBlock text="Conectando con el servidor…" />
                )}
            </div>
        </div>
    )
}