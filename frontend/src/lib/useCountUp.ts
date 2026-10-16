import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 700) {
    const [value, setValue] = useState(0)
    const current = useRef(0)

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            current.current = target
            setValue(target)
            return
        }

        const start = performance.now()
        const initial = current.current
        let frame = 0

        const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / duration)
            const eased = 1 - Math.pow(1 - progress, 3)

            current.current = initial + (target - initial) * eased
            setValue(current.current)

            if (progress < 1) frame = requestAnimationFrame(tick)
        }

        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [target, duration])

    return value
}