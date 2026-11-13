import { useCallback, useEffect, useRef } from 'react'

/**
 * Envuelve una función de carga para que:
 * - nunca haya dos peticiones al mismo tiempo,
 * - como máximo salga una cada `minGap` ms,
 * - las llamadas que lleguen mientras tanto se junten en una sola.
 * La función devuelta es estable: es seguro usarla en dependencias de useEffect.
 */
export function useCoalesced(fn: () => Promise<unknown>, minGap = 1500) {
    const fnRef = useRef(fn)
    fnRef.current = fn

    const state = useRef({ running: false, pending: false, last: 0, timer: 0 as ReturnType<typeof setTimeout> | 0 })

    useEffect(() => () => {
        if (state.current.timer) clearTimeout(state.current.timer)
    }, [])

    return useCallback(() => {
        const s = state.current

        if (s.running || s.timer) {
            s.pending = true
            return
        }

        const schedule = () => {
            const wait = Math.max(0, minGap - (Date.now() - s.last))
            s.timer = setTimeout(run, wait)
        }

        const run = async () => {
            s.timer = 0
            s.running = true
            s.last = Date.now()

            try {
                await fnRef.current()
            } catch {
                /* el error lo maneja quien llama */
            } finally {
                s.running = false

                if (s.pending) {
                    s.pending = false
                    schedule()
                }
            }
        }

        schedule()
    }, [minGap])
}