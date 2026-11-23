import { addDaysYmd, daysBetween, kindLabel, useAdminAbsences } from '../lib/absences'
import { toDate, ymd } from '../lib/format'
import type { Page } from '../lib/types'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { StateView } from './StatusBlocks'

const short = (d: string) => toDate(d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })

export function AbsencesWidget({ token, onNavigate }: { token: string; onNavigate: (page: Page) => void }) {
    const state = useAdminAbsences(token, true)
    const today = ymd(new Date())
    const year = new Date().getFullYear()
    const daysLeft = daysBetween(today, `${year}-12-31`)

    return (
        <section className="dashboard-card abs-widget">
            <div className="abs-section-head">
                <div>
                    <h2>Ausencias y vacaciones</h2>
                    <p className="muted">Lo que viene en las próximas dos semanas.</p>
                </div>
                <button type="button" className="link" onClick={() => onNavigate('admin-vacations')}>
                    Ver todo <Icon name="right" size={14} />
                </button>
            </div>

            <StateView state={state}>
                {({ absences, people, balances }) => {
                    const upcoming = absences
                        .filter(a => a.status === 'approved' && a.start > today && a.start <= addDaysYmd(today, 14))
                        .sort((x, y) => x.start.localeCompare(y.start))
                        .slice(0, 5)

                    const expiring = balances
                        .filter(b => b.available > 0)
                        .sort((a, b) => b.available - a.available)
                        .slice(0, 5)

                    const maxAvailable = Math.max(1, ...expiring.map(b => b.available))

                    return (
                        <div className="abs-widget-grid">
                            <div>
                                <h3 className="abs-widget-title">Próximas ausencias</h3>
                                {upcoming.length === 0 ? (
                                    <p className="pending-request-empty">Nadie sale en los próximos 14 días.</p>
                                ) : (
                                    <ul className="abs-list">
                                        {upcoming.map(a => (
                                            <li key={a.key} className="abs-item static">
                                                <Avatar user={{ full_name: a.name, avatar: people.get(a.userId)?.avatar ?? null }} size="sm" />
                                                <span className="person-text">
                                                    <strong>{a.name}</strong>
                                                    <span>
                                                        <i className={`abs-kind ${a.kind}`} /> {kindLabel(a)} · {a.days} d
                                                    </span>
                                                </span>
                                                <span className="abs-when cap">{short(a.start)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div>
                                <h3 className="abs-widget-title">
                                    Vacaciones por vencer <small>· quedan {daysLeft} días del año</small>
                                </h3>
                                {expiring.length === 0 ? (
                                    <p className="pending-request-empty">Nadie tiene días pendientes de usar.</p>
                                ) : (
                                    <ul className="abs-list">
                                        {expiring.map(b => (
                                            <li key={b.user_id} className="abs-item static">
                                                <Avatar user={b} size="sm" />
                                                <span className="person-text">
                                                    <strong>{b.full_name}</strong>
                                                    <span className="bal-bar thin" aria-hidden="true">
                                                        <span className="available" style={{ width: `${(b.available / maxAvailable) * 100}%` }} />
                                                    </span>
                                                </span>
                                                <span className={`abs-when ${daysLeft <= 60 ? 'warn' : ''}`}>{b.available} días</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )
                }}
            </StateView>
        </section>
    )
}