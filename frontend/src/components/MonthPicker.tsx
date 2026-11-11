import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function MonthPicker({ value, onChange }: { value: Date; onChange: (month: Date) => void }) {
    const [open, setOpen] = useState(false)
    const [year, setYear] = useState(value.getFullYear())
    const ref = useRef<HTMLDivElement>(null)
    const now = new Date()

    useEffect(() => {
        if (!open) return
        setYear(value.getFullYear())

        const outside = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)

        document.addEventListener('mousedown', outside)
        window.addEventListener('keydown', onKey)

        return () => {
            document.removeEventListener('mousedown', outside)
            window.removeEventListener('keydown', onKey)
        }
    }, [open, value])

    const shift = (delta: number) => onChange(new Date(value.getFullYear(), value.getMonth() + delta, 1))

    return (
        <div className="month-picker" ref={ref}>
            <button type="button" className="mp-arrow" aria-label="Mes anterior" onClick={() => shift(-1)}>
                <Icon name="left" size={16} />
            </button>

            <button
                type="button"
                className={`mp-label ${open ? 'open' : ''}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
            >
                <span className="cap">{value.toLocaleDateString('es-MX', { month: 'long' })}</span>
                <b>{value.getFullYear()}</b>
                <span className="mp-caret">
                    <Icon name="right" size={12} />
                </span>
            </button>

            <button type="button" className="mp-arrow" aria-label="Mes siguiente" onClick={() => shift(1)}>
                <Icon name="right" size={16} />
            </button>

            {open && (
                <div className="mp-pop" role="dialog" aria-label="Elegir mes">
                    <div className="mp-year">
                        <button type="button" className="mp-arrow" aria-label="Año anterior" onClick={() => setYear(y => y - 1)}>
                            <Icon name="left" size={14} />
                        </button>
                        <strong>{year}</strong>
                        <button type="button" className="mp-arrow" aria-label="Año siguiente" onClick={() => setYear(y => y + 1)}>
                            <Icon name="right" size={14} />
                        </button>
                    </div>

                    <div className="mp-grid">
                        {MONTHS.map((label, month) => {
                            const selected = year === value.getFullYear() && month === value.getMonth()
                            const current = year === now.getFullYear() && month === now.getMonth()

                            return (
                                <button
                                    key={label}
                                    type="button"
                                    className={`${selected ? 'selected' : ''} ${current ? 'current' : ''}`}
                                    onClick={() => {
                                        onChange(new Date(year, month, 1))
                                        setOpen(false)
                                    }}
                                >
                                    {label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}