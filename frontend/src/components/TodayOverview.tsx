import type { AsyncState } from '../lib/useAsync.ts'
import { formatRange } from '../lib/format'
import type { TodayOverview as TodayOverviewData, User } from '../lib/types'
import { Avatar } from './Avatar'
import { StateView } from '../components/StatusBlocks'

const hhmm = (value: string) =>
    new Date(value).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

function PersonRow({
    user,
    line,
    badge,
}: {
    user: User
    line: string
    badge?: React.ReactNode
}) {
    return (
        <div className="person-item">
            <Avatar user={user} size="sm" />

            <div className="person-text">
                <strong>{user.full_name}</strong>
                <span>{line}</span>
            </div>

            {badge}
        </div>
    )
}

function CardTitle({ eyebrow, title, count }: { eyebrow: string; title: string; count: number | string }) {
    return (
        <div className="dashboard-card-title">
            <div>
                <p className="eyebrow">{eyebrow}</p>
                <h2>{title}</h2>
            </div>
            <span className="dashboard-card-icon">{count}</span>
        </div>
    )
}

export function TodayOverview({ state }: { state: AsyncState<TodayOverviewData> }) {
    return (
        <StateView state={state}>
            {data => (
                <section className="today-grid">
                    {/* SIN REGISTRAR */}
                    <article className="dashboard-card">
                        <CardTitle
                            eyebrow="ASISTENCIA"
                            title="Sin registrar hoy"
                            count={data.is_workday ? data.missing.length : '–'}
                        />

                        {!data.is_workday ? (
                            <p className="pending-request-empty">Hoy no es día laborable.</p>
                        ) : (
                            <>
                                {!data.limit_passed && (
                                    <p className="notice">
                                        Aún dentro del horario de tolerancia (hasta las {data.late_limit}).
                                    </p>
                                )}

                                {data.missing.length === 0 ? (
                                    <p className="pending-request-empty">
                                        Todo el equipo está al día.
                                    </p>
                                ) : (
                                    <div className="today-list">
                                        {data.missing.map(user => (
                                            <PersonRow key={user.id} user={user} line={user.email} />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </article>

                    {/* YA REGISTRARON */}
                    <article className="dashboard-card">
                        <CardTitle
                            eyebrow="ASISTENCIA"
                            title="Ya registraron hoy"
                            count={data.registered.length}
                        />

                        {data.registered.length === 0 ? (
                            <p className="pending-request-empty">Nadie ha registrado entrada todavía.</p>
                        ) : (
                            <div className="today-list">
                                {data.registered.map(item => (
                                    <PersonRow
                                        key={item.user.id}
                                        user={item.user}
                                        line={`Entrada ${hhmm(item.entry_at)} · ${
                                            item.exit_at ? `Salida ${hhmm(item.exit_at)}` : 'En curso'
                                        }`}
                                        badge={
                                            item.status === 'late' ? (
                                                <span className="badge late">Retraso</span>
                                            ) : undefined
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </article>

                    {/* VACACIONES */}
                    <article className="dashboard-card">
                        <CardTitle
                            eyebrow="AUSENCIAS"
                            title="De vacaciones"
                            count={data.on_vacation.length}
                        />

                        {data.on_vacation.length === 0 ? (
                            <p className="pending-request-empty">Nadie está de vacaciones hoy.</p>
                        ) : (
                            <div className="today-list">
                                {data.on_vacation.map(item => (
                                    <PersonRow
                                        key={item.user.id}
                                        user={item.user}
                                        line={formatRange(item.start_date, item.end_date)}
                                    />
                                ))}
                            </div>
                        )}

                        {data.on_permission.length > 0 && (
                            <>
                                <p className="today-subtitle">Con permiso hoy</p>

                                <div className="today-list">
                                    {data.on_permission.map(item => (
                                        <PersonRow
                                            key={item.user.id}
                                            user={item.user}
                                            line={`${item.kind === 'paid' ? 'Con goce' : 'Sin goce'} · ${formatRange(
                                                item.start_date,
                                                item.end_date
                                            )}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </article>
                </section>
            )}
        </StateView>
    )
}