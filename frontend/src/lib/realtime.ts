import { api } from './api' // la URL base que usa tu api.ts; ajusta el nombre si es distinto
import { emit } from './events'
import type { AppEvent } from './events'

const EVENTS: Record<string, AppEvent> = {
    notifications: 'notifications:changed',
    requests: 'requests:changed',
    posts: 'posts:changed',
    attendance: 'attendance:changed',
}

const emitAll = () => Object.values(EVENTS).forEach(e => emit(e, { broadcast: false }))

export function startRealtime(token: string) {
    let stopped = false
    let controller: AbortController | null = null
    let delay = 2000
    let reconnecting = false

    const connect = async () => {
        if (stopped) return
        controller = new AbortController()

        try {
            const response = await fetch(`${api}/events/stream`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
                signal: controller.signal,
            })

            if (response.status === 401 || response.status === 403) return // sesión vencida
            if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)

            delay = 2000
            if (reconnecting) emitAll() // se pone al día con lo que pasó mientras no hubo conexión

            const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
            let buffer = ''

            for (;;) {
                const { value, done } = await reader.read()
                if (done) break

                buffer += value
                let cut: number

                while ((cut = buffer.indexOf('\n\n')) >= 0) {
                    const block = buffer.slice(0, cut)
                    buffer = buffer.slice(cut + 2)

                    const name = block
                        .split('\n')
                        .find(line => line.startsWith('event:'))
                        ?.slice(6)
                        .trim()

                    if (name && EVENTS[name]) emit(EVENTS[name], { broadcast: false })
                }
            }
        } catch {
            if (stopped) return
        }

        if (!stopped) {
            reconnecting = true
            setTimeout(connect, delay)
            delay = Math.min(delay * 2, 30_000)
        }
    }

    connect()

    return () => {
        stopped = true
        controller?.abort()
    }
}