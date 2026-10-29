import type { AsyncState } from '../lib/useAsync'
import { formatRange, parseServerDate } from '../lib/format'
import type { TodayOverview as TodayOverviewData, User } from '../lib/types'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { StateView } from './StatusBlocks'

const hhmm = (value: string) =>
    parseServerDate(value).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

function Row({ user, line, meta, tone }: { user: User; line: string; meta?: string; tone?: string }) {
    return (
        <li className="overview-row">
            <Avatar user={user} size="sm" />
            <div className="person-text">
                <strong>{user.full_name}</strong>
                <span>{line}</span>
            </div>
            {meta && <span className={`overview-meta ${tone ?? ''}`}>{meta}</span>}
        </li>
    )
}

function Panel({
    icon,
    tone,
    title,
    count,
    empty,
    children,
}: {
    icon: IconName
    tone: string
    title: string
    count: number
    empty: string
    children: React.ReactNode
}) {
    return (
        <article className="dashboard-card overview-panel">
            <header className="overview-panel-head">
                <span className={`overview-panel-icon ${tone}`}>
                    <Icon name={icon} size={17} />
                </span>
                <h2>{title}</h2>
                <span className={`overview-count ${tone}`}>{count}</span>
            </header>

            {count === 0 ? (
                <div className="overview-empty">
                    <Icon name={icon} size={22} />
                    <p>{empty}</p>
                </div>
            ) : (
                <ul className="overview-list">{children}</ul>
            )}
        </article>
    )
}

export function TodayOverview({ state }: { state: AsyncState<TodayOverviewData> }) {
    return (
        <StateView state={state}>
            {data => (
                <section className="today-grid">
                    <Panel
                        icon="alert"
                        tone="bad"
                        title="Sin registrar"
                        count={data.is_workday ? data.missing.length : 0}
                        empty={
                            data.holiday_name
                                ? `Hoy es festivo: ${data.holiday_name}.`
                                : !data.is_workday
                                  ? 'Hoy no es día laborable.'
                                  : 'Todo el equipo está al día.'
                        }
                    >
                        {data.missing.map(user => (
                            <Row key={user.id} user={user} line={user.email} meta="Pendiente" tone="bad" />
                        ))}
                    </Panel>

                    <Panel icon="check" tone="ok" title="Ya registraron" count={data.registered.length} empty="Nadie ha iniciado su jornada todavía.">
                        {data.registered.map(item => (
                            <Row
                                key={item.user.id}
                                user={item.user}
                                line={`${item.exit_at ? `Salida ${hhmm(item.exit_at)}` : 'En curso'}${item.remote ? ' · Remoto' : ''}`}
                                meta={hhmm(item.entry_at)}
                                tone={item.status === 'late' ? 'warn' : 'ok'}
                            />
                        ))}
                    </Panel>

                    <Panel
                        icon="sun"
                        tone="info"
                        title="Ausencias autorizadas"
                        count={data.on_vacation.length + data.on_permission.length}
                        empty="Nadie está de vacaciones ni con permiso hoy."
                    >
                        {data.on_vacation.map(item => (
                            <Row key={`v-${item.user.id}`} user={item.user} line={formatRange(item.start_date, item.end_date)} meta="Vacaciones" tone="info" />
                        ))}
                        {data.on_permission.map(item => (
                            <Row
                                key={`p-${item.user.id}`}
                                user={item.user}
                                line={formatRange(item.start_date, item.end_date)}
                                meta={item.kind === 'paid' ? 'Con goce' : 'Sin goce'}
                                tone="purple"
                            />
                        ))}
                    </Panel>
                </section>
            )}
        </StateView>
    )
}