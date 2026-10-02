import { useEffect, useState } from 'react'

export function LiveClock() {
    const [now, setNow] = useState(new Date())

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

    return (
        <div className="attendance-clock">
            <strong>{now.toLocaleTimeString('es-MX', { hour12: false })}</strong>
            <span>{now.toLocaleDateString('es-MX', { dateStyle: 'full' })}</span>
        </div>
    )
}