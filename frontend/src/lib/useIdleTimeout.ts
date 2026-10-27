import { useCallback, useEffect, useRef, useState } from 'react'

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart', 'wheel'] as const

export function useIdleTimeout({
    enabled,
    timeoutMs,
    warningMs,
    onTimeout,
}: {
    enabled: boolean
    timeoutMs: number
    warningMs: number
    onTimeout: () => void
}) {
    const lastActivity = useRef(Date.now())
    const timeoutRef = useRef(onTimeout)
    timeoutRef.current = onTimeout

    const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

    const stayActive = useCallback(() => {
        lastActivity.current = Date.now()
        setSecondsLeft(null)
    }, [])

    useEffect(() => {
        if (!enabled) {
            setSecondsLeft(null)
            return
        }

        lastActivity.current = Date.now()
        const mark = () => {
            lastActivity.current = Date.now()
        }

        ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, mark, { passive: true }))

        const tick = setInterval(() => {
            const idle = Date.now() - lastActivity.current

            if (idle >= timeoutMs) {
                clearInterval(tick)
                setSecondsLeft(null)
                timeoutRef.current()
                return
            }

            const remaining = timeoutMs - idle
            setSecondsLeft(remaining <= warningMs ? Math.ceil(remaining / 1000) : null)
        }, 1000)

        return () => {
            clearInterval(tick)
            ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, mark))
        }
    }, [enabled, timeoutMs, warningMs])

    return { secondsLeft, stayActive }
}