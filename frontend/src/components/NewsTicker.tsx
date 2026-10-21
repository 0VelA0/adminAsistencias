import { api } from '../lib/api'
import { longDate, parseServerDate, timeAgo } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { Post } from '../lib/types'
import { Avatar } from './Avatar'
import { Icon } from './Icon'

const THREE_DAYS = 3 * 24 * 60 * 60 * 1000

function TickerCard({ post, clone = false, onOpen }: { post: Post; clone?: boolean; onOpen: () => void }) {
    const meeting = post.kind === 'meeting'
    const fresh = !post.my_response && Date.now() - parseServerDate(post.created_at).getTime() < THREE_DAYS

    return (
        <button
            type="button"
            className={`ticker-card ${meeting ? 'meeting' : ''} ${clone ? 'ticker-clone' : ''}`}
            aria-hidden={clone || undefined}
            tabIndex={clone ? -1 : 0}
            onClick={onOpen}
        >
            <span className="ticker-kind">
                <Icon name={meeting ? 'calendar' : 'megaphone'} size={13} />
                {meeting ? 'Reunión' : 'Comunicado'}
                {fresh && <em>Nuevo</em>}
            </span>

            <strong className="ticker-title">{post.title}</strong>

            {meeting && post.meeting_date ? (
                <span className="ticker-when">
                    <Icon name="clock" size={12} />
                    <span className="cap">{longDate(post.meeting_date)}</span> · {post.start_time}
                </span>
            ) : (
                <span className="ticker-excerpt">{post.body}</span>
            )}

            <span className="ticker-author">
                <Avatar user={post.author} size="sm" />
                <span>
                    <b>{post.author.full_name}</b>
                    <small>{timeAgo(post.created_at)}</small>
                </span>
            </span>
        </button>
    )
}

export function NewsTicker({ token, onOpen }: { token: string; onOpen: () => void }) {
    const posts = useAsync(() => api<Post[]>('/posts?limit=8', {}, token), [token])

    if (posts.error && !posts.data) return null // no es crítico: si falla, no estorba

    const list = posts.data ?? []
    const moving = list.length >= 3

    return (
        <section className="dashboard-card news-ticker">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">COMUNICADOS</p>
                    <h2>Lo último en la empresa</h2>
                </div>

                <button type="button" className="link" onClick={onOpen}>
                    Ver todos <Icon name="right" size={14} />
                </button>
            </div>

            {!posts.data ? (
                <div className="ticker-skeleton" aria-label="Cargando comunicados">
                    <span />
                    <span />
                    <span />
                </div>
            ) : list.length === 0 ? (
                <p className="pending-request-empty">Aún no hay comunicados.</p>
            ) : (
                <div
                    className={`ticker ${moving ? 'moving' : ''}`}
                    style={{ '--ticker-duration': `${list.length * 7}s` } as React.CSSProperties}
                >
                    <div className="ticker-track">
                        {list.map(post => (
                            <TickerCard key={post.id} post={post} onOpen={onOpen} />
                        ))}

                        {/* copia para que el bucle no tenga corte */}
                        {moving &&
                            list.map(post => (
                                <TickerCard key={`clone-${post.id}`} post={post} clone onOpen={onOpen} />
                            ))}
                    </div>
                </div>
            )}
        </section>
    )
}