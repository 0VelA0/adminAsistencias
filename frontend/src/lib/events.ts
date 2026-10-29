import { useEffect, useRef } from 'react'

export type AppEvent = 'requests:changed' | 'posts:changed' | 'attendance:changed'

const bus = new EventTarget()

// También avisa a las otras pestañas abiertas del mismo navegador
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('app-events') : null
channel?.addEventListener('message', e => bus.dispatchEvent(new Event(e.data as AppEvent)))

export function emit(event: AppEvent) {
    bus.dispatchEvent(new Event(event))
    channel?.postMessage(event)
}

export function useAppEvent(event: AppEvent, handler: () => void) {
    const ref = useRef(handler)
    ref.current = handler

    useEffect(() => {
        const listener = () => ref.current()
        bus.addEventListener(event, listener)
        return () => bus.removeEventListener(event, listener)
    }, [event])
}