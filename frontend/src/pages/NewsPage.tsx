import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { emit } from '../lib/events'
import { longDate } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { Post, PostsMeta, User } from '../lib/types'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { PostCard } from '../components/PostCard'
import { PostModal } from '../components/PostModal'
import { ResponsesModal } from '../components/ResponsesModal'
import { StateView } from '../components/StatusBlocks'
import { useToast } from '../components/Toast'

const FILTERS = [
    { value: 'all', label: 'Todo', icon: 'home' },
    { value: 'announcement', label: 'Comunicados', icon: 'megaphone' },
    { value: 'meeting', label: 'Reuniones', icon: 'calendar' },
    { value: 'archived', label: 'Archivados', icon: 'bookmark' },
] as const

type Filter = (typeof FILTERS)[number]['value']

export function NewsPage({ token, user }: { token: string; user: User }) {
    const toast = useToast()

    const [filter, setFilter] = useState<Filter>('all')
    const [limit, setLimit] = useState(20)
    const [version, setVersion] = useState(0)
    const [overrides, setOverrides] = useState<Record<number, Post>>({})
    const [busyId, setBusyId] = useState<number | null>(null)
    const [editing, setEditing] = useState<{ post: Post | null; kind?: Post['kind'] } | null>(null)
    const [responsesOf, setResponsesOf] = useState<Post | null>(null)

    const meta = useAsync(() => api<PostsMeta>('/posts/meta', {}, token), [token])

    const query =
        filter === 'archived' ? '&archived=true' : filter === 'all' ? '' : `&kind=${filter}`

    const posts = useAsync(() => api<Post[]>(`/posts?limit=${limit}${query}`, {}, token), [token, query, limit, version])
    const upcoming = useAsync(() => api<Post[]>('/posts?upcoming=true&limit=5', {}, token), [token, version])

    // Lo que se muestra en el feed queda como visto
    useEffect(() => {
        const unseen = (posts.data ?? []).filter(p => !p.seen).map(p => p.id)
        if (!unseen.length) return

        api('/posts/seen', { method: 'POST', body: JSON.stringify({ ids: unseen }) }, token)
            .then(() => emit('posts:changed'))
            .catch(() => undefined)
    }, [posts.data, token])

    const reload = () => {
        setOverrides({})
        setVersion(v => v + 1)
        emit('posts:changed')
    }

    const replace = (updated: Post) => setOverrides(current => ({ ...current, [updated.id]: updated }))

    const respond = async (post: Post, response: string) => {
        setBusyId(post.id)

        try {
            replace(await api<Post>(`/posts/${post.id}/respond`, { method: 'POST', body: JSON.stringify({ response }) }, token))
            emit('posts:changed')
            if (response === 'yes') toast.success('Confirmaste tu asistencia.')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo guardar tu respuesta.')
        } finally {
            setBusyId(null)
        }
    }

    const toggleFeed = async (post: Post, inFeed: boolean) => {
        try {
            await api(`/posts/${post.id}/feed`, { method: 'POST', body: JSON.stringify({ in_feed: inFeed }) }, token)
            toast.success(inFeed ? 'Regresó a tu feed.' : 'Se quitó de tu feed.')
            reload()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo mover.')
        }
    }

    const archive = async (post: Post, archived: boolean) => {
        try {
            await api(`/posts/${post.id}/archive`, { method: 'POST', body: JSON.stringify({ archived }) }, token)
            toast.success(archived ? 'Publicación archivada para todos.' : 'Publicación desarchivada.')
            reload()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo archivar.')
        }
    }

    const remove = async (post: Post) => {
        const extra = post.space_name ? ' Se liberará la reserva de la sala.' : ''
        if (!window.confirm(`¿Eliminar "${post.title}"?${extra}`)) return

        try {
            await api(`/posts/${post.id}`, { method: 'DELETE' }, token)
            toast.success('Publicación eliminada.')
            reload()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo eliminar.')
        }
    }

    return (
        <div className="page-content">
            <PageHeader
                eyebrow="COMUNICADOS"
                title="Novedades de la empresa"
                description="Avisos, reuniones y noticias del equipo."
                actions={
                    meta.data?.can_publish && (
                        <button type="button" onClick={() => setEditing({ post: null })}>
                            <Icon name="plus" size={16} /> Nueva publicación
                        </button>
                    )
                }
            />

            <div className="news-filters" role="tablist">
                {FILTERS.map(f => (
                    <button
                        key={f.value}
                        type="button"
                        role="tab"
                        aria-selected={filter === f.value}
                        className={filter === f.value ? 'active' : ''}
                        onClick={() => {
                            setFilter(f.value)
                            setLimit(20)
                            setOverrides({})
                        }}
                    >
                        <Icon name={f.icon} size={14} /> {f.label}
                    </button>
                ))}
            </div>

            <div className="news-layout">
                <div className="news-feed">
                    {meta.data?.can_publish && filter !== 'archived' && (
                        <div className="composer">
                            <Avatar user={user} size="md" />

                            <button type="button" className="composer-input" onClick={() => setEditing({ post: null })}>
                                ¿Qué quieres compartir con el equipo?
                            </button>

                            <div className="composer-actions">
                                <button type="button" className="secondary compact" onClick={() => setEditing({ post: null, kind: 'announcement' })}>
                                    <Icon name="megaphone" size={14} /> Comunicado
                                </button>
                                <button type="button" className="secondary compact" onClick={() => setEditing({ post: null, kind: 'meeting' })}>
                                    <Icon name="calendar" size={14} /> Reunión
                                </button>
                            </div>
                        </div>
                    )}

                    <StateView state={posts}>
                        {list =>
                            list.length === 0 ? (
                                <div className="empty-state">
                                    <Icon name={filter === 'archived' ? 'bookmark' : 'megaphone'} size={30} />
                                    <strong>{filter === 'archived' ? 'No hay publicaciones archivadas' : 'Todavía no hay publicaciones'}</strong>
                                    <p className="muted">
                                        {filter === 'archived'
                                            ? 'Las reuniones terminadas y lo que archive un administrador aparecerá aquí.'
                                            : 'Aquí aparecerán los avisos y reuniones de la empresa.'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {list.map((post, i) => (
                                        <PostCard
                                            key={post.id}
                                            index={i}
                                            post={overrides[post.id] ?? post}
                                            busy={busyId === post.id}
                                            isAdmin={meta.data?.is_admin}
                                            onRespond={respond}
                                            onEdit={p => setEditing({ post: p })}
                                            onDelete={remove}
                                            onShowResponses={p => setResponsesOf(p)}
                                            onToggleFeed={filter === 'archived' ? toggleFeed : undefined}
                                            onArchive={archive}
                                        />
                                    ))}

                                    {list.length >= limit && (
                                        <button type="button" className="secondary show-more" onClick={() => setLimit(l => l + 20)}>
                                            Ver publicaciones anteriores
                                        </button>
                                    )}
                                </>
                            )
                        }
                    </StateView>
                </div>

                <aside className="news-aside">
                    <section className="dashboard-card agenda-card">
                        <div className="agenda-head">
                            <span className="agenda-icon">
                                <Icon name="calendar" size={18} />
                            </span>
                            <div>
                                <p className="eyebrow">AGENDA</p>
                                <h2>Próximas reuniones</h2>
                            </div>
                        </div>

                        <StateView state={upcoming}>
                            {list =>
                                list.length === 0 ? (
                                    <p className="pending-request-empty">No hay reuniones próximas.</p>
                                ) : (
                                    <ol className="agenda-list">
                                        {list.map(m => (
                                            <li key={m.id}>
                                                <div className="mini-date">
                                                    <strong>{new Date(`${m.meeting_date}T00:00:00`).getDate()}</strong>
                                                    <span>{new Date(`${m.meeting_date}T00:00:00`).toLocaleDateString('es-MX', { month: 'short' })}</span>
                                                </div>

                                                <div className="person-text">
                                                    <strong>{m.title}</strong>
                                                    <span className="cap">
                                                        {longDate(m.meeting_date!)} · {m.start_time}
                                                    </span>
                                                </div>

                                                {m.my_response === 'yes' && <span className="badge approved">Asistirás</span>}
                                            </li>
                                        ))}
                                    </ol>
                                )
                            }
                        </StateView>
                    </section>
                </aside>
            </div>

            {editing && meta.data && (
                <PostModal
                    token={token}
                    meta={meta.data}
                    post={editing.post}
                    initialKind={editing.kind}
                    onClose={() => setEditing(null)}
                    onSaved={reload}
                />
            )}

            {responsesOf && <ResponsesModal token={token} post={responsesOf} onClose={() => setResponsesOf(null)} />}
        </div>
    )
}