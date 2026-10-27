const TOKEN_KEY = 'attendance_token'

export function readToken(): string {
    try {
        return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''
    } catch {
        return ''
    }
}

/** Recordada = localStorage. No recordada = sessionStorage (muere al cerrar la pestaña). */
export function isRemembered(): boolean {
    try {
        return Boolean(localStorage.getItem(TOKEN_KEY))
    } catch {
        return false
    }
}

export function saveToken(token: string, remember: boolean) {
    clearToken()

    try {
        ;(remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token)
    } catch {
        /* sin almacenamiento: la sesión dura lo que la página abierta */
    }
}

export function clearToken() {
    try {
        localStorage.removeItem(TOKEN_KEY)
        sessionStorage.removeItem(TOKEN_KEY)
    } catch {
        /* nada que limpiar */
    }
}