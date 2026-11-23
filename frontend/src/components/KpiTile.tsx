import { useCountUp } from '../lib/useCountUp'
import { Icon } from './Icon'
import type { IconName } from './Icon'

export function KpiTile({
    label,
    value,
    icon,
    tone,
    suffix,
    hint,
    onClick,
}: {
    label: string
    value: number | null
    icon: IconName
    tone: 'ok' | 'warn' | 'bad' | 'info'
    suffix?: string
    hint?: string
    onClick?: () => void
}) {
    const shown = useCountUp(value ?? 0)

    return (
        <article
            className={`stat-tile ${tone} ${onClick ? 'clickable' : ''}`}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick}
            onKeyDown={e => onClick && e.key === 'Enter' && onClick()}
        >
            <span className="stat-icon">
                <Icon name={icon} size={18} />
            </span>
            <strong>
                {value === null ? '–' : Math.round(shown)}
                {suffix && value !== null && <small className="stat-suffix">{suffix}</small>}
            </strong>
            <span>{label}</span>
            {hint && <small className="stat-hint">{hint}</small>}
            {onClick && <Icon name="right" size={14} />}
        </article>
    )
}