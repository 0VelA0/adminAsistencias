import type { ReactNode } from 'react'

export function PageHeader({
    eyebrow,
    title,
    description,
    actions,
}: {
    eyebrow: string
    title: string
    description?: string
    actions?: ReactNode
}) {
    return (
        <header className="page-header">
            <div className="page-header-text">
                <p className="eyebrow">{eyebrow}</p>
                <h2>{title}</h2>
                {description && <p className="muted">{description}</p>}
            </div>

            {actions && <div className="page-header-actions">{actions}</div>}
        </header>
    )
}