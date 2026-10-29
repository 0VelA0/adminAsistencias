import { useLayoutEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useAppEvent } from '../lib/events'
import { longDate, timeAgo } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { Post } from '../lib/types'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { PostViewerModal } from './PostViewerModal'

const GAP = 14
const SPEED = 40 // píxeles por segundo

function TickerCard({ post, hidden, onOpen }: { post: Post; hidden: boolean; onOpen: (post: Post) => void }) {
    const meeting = post.kind === 'meeting'

    return (
        <button
            type="button"
            className={`ticker-card ${meeting ? 'meeting' : ''}`}
            aria-hidden={hidden || undefined}
            tabIndex={hidden ? -1 : 0}
            onClick={() => onOpen(post)}
        >
            <span className="ticker-kind">
                <Icon name={meeting ? 'calendar' : 'megaphone'} size={13} />
                {meeting ? 'Reunión' : 'Comunicado'}
                {!post.seen && <em>Nuevo</em>}
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
    useAppEvent('posts:changed', posts.reload)

    const [viewing, setViewing] = useState<Post | null>(null)
    const [layout, setLayout] = useState({ copies: 2, width: 0 })
    const viewportRef = useRef<HTMLDivElement>(null)
    const setRef = useRef<HTMLDivElement>(null)

    const list = posts.data ?? []
    const moving = list.length >= 2

    // Repite la lista las veces necesarias para que nunca quede un hueco
    useLayoutEffect(() => {
        if (!moving) return

        const measure = () => {
            const viewport = viewportRef.current?.clientWidth ?? 0
            const width = setRef.current?.offsetWidth ?? 0
            if (!width) return

            setLayout({ copies: Math.max(2, Math.ceil(viewport / width) + 1), width })
        }

        measure()

        const observer = new ResizeObserver(measure)
        if (viewportRef.current) observer.observe(viewportRef.current)
        if (setRef.current) observer.observe(setRef.current)

        return () => observer.disconnect()
    }, [moving, list.length])

    if (posts.error && !posts.data) return null

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
                <div ref={viewportRef} className={`ticker ${moving ? 'moving' : ''}`}>
                    <div
                        className="ticker-track"
                        style={
                            {
                                '--set-width': `${layout.width}px`,
                                '--ticker-duration': `${Math.max(layout.width / SPEED, 12)}s`,
                            } as React.CSSProperties
                        }
                    >
                        {Array.from({ length: moving ? layout.copies : 1 }, (_, copy) => (
                            <div className="ticker-set" key={copy} ref={copy === 0 ? setRef : undefined}>
                                {list.map(post => (
                                    <TickerCard key={`${copy}-${post.id}`} post={post} hidden={copy > 0} onOpen={setViewing} />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {viewing && (
                <PostViewerModal
                    token={token}
                    post={viewing}
                    onClose={() => setViewing(null)}
                    onOpenAll={() => {
                        setViewing(null)
                        onOpen()
                    }}
                />
            )}
        </section>
    )
}