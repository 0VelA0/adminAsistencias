import { useCallback, useEffect, useRef, useState } from 'react'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export type AsyncState<T> = {
    data: T | null
    loading: boolean
    error: string | null
    reload: () => void
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [tick, setTick] = useState(0)

    const fnRef = useRef(fn)
    fnRef.current = fn

    useEffect(() => {
        let cancelled = false

        setLoading(true)
        setError(null)

        const run = async () => {
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const result = await fnRef.current()

                    if (!cancelled) {
                        setData(result)
                        setLoading(false)
                    }

                    return
                } catch (e) {
                    if (attempt === 2) {
                        if (!cancelled) {
                            setError(e instanceof Error ? e.message : 'Error desconocido')
                            setLoading(false)
                        }

                        return
                    }

                    await sleep(700 * (attempt + 1))
                    if (cancelled) return
                }
            }
        }

        run()

        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, tick])

    const reload = useCallback(() => setTick(t => t + 1), [])

    return { data, loading, error, reload }
}