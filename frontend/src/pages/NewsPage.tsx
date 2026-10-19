import { useState } from 'react'
import { api } from '../lib/api'
import { longDate } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { Post, PostsMeta } from '../lib/types'
import { Icon } from '../components/Icon'
import { PostCard } from '../components/PostCard'
import { PostModal } from '../components/PostModal'
import { ResponsesModal } from '../components/ResponsesModal'
import { StateView } from '../components/StatusBlocks'
import { useToast } from '../components/Toast'

const FILTERS = [
    { value: 'all', label: 'Todo' },
    { value: 'announcement', label: 'Comunicados' },
    { value: 'meeting', label: 'Reuniones' },
] as const

export function NewsPage({ token }: { token: string }) {
    const toast = useToast()

    const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all')
    const [limit, setLimit] = useState(20)
    const [version, setVersion] = useState(0)
    const [overrides, setOverrides] = useState<Record<number, Post>>({})
    const [busyId, setBusyId] = useState<number | null>(null)
    const [editing, setEditing] = useState<Post | null | 'new'>(null)
    const [responsesOf, setResponsesOf] = useState<Post | null>(null)

    const meta = useAsync(() => api<PostsMeta>('/posts/meta', {}, token), [token])

    const posts = useAsync(
        () => api<Post[]>(`/posts?limit=${limit}${filter === 'all' ? '' : `&kind=${filter}`}`, {}, token),
        [token, filter, limit, version]
    )

    const upcoming = useAsync(() => api<Post[]>('/posts?upcoming=true&limit=5', {}, token), [token, version])

    const reload = () => {
        setOverrides({})
        setVersion(v => v + 1)
    }

    const respond = async (post: Post, response: string) => {
        setBusyId(post.id)

        try {
            const updated = await api<Post>(
                `/posts/${post.id}/respond`,
                { method: 'POST', body: JSON.stringify({ response }) },
                token
            )

            setOverrides(current => ({ ...current, [post.id]: updated }))

            if (response === 'yes') toast.success('Confirmaste tu asistencia.')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo guardar tu respuesta.')
        } finally {
            setBusyId(null)
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
            <div className="page-heading">
                <div>
                    <p className="eyebrow">COMUNICADOS</p>
                    <h2>Novedades de la empresa</h2>
                    <p className="muted">Avisos, reuniones y noticias del equipo.</p>
                </div>

                {meta.data?.can_publish && (
                    <button type="button" onClick={() => setEditing('new')}>
                        <Icon name="plus" size={16} /> Nueva publicación
                    </button>
                )}
            </div>

            <div className="news-layout">
                <div className="news-feed">
                    <div className="filter-tabs">
                        {FILTERS.map(f => (
                            <button
                                key={f.value}
                                type="button"
                                className={filter === f.value ? 'active' : ''}
                                onClick={() => {
                                    setFilter(f.value)
                                    setLimit(20)
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <StateView state={posts}>
                        {list =>
                            list.length === 0 ? (
                                <div className="dashboard-card empty-feed">
                                    <Icon name="megaphone" size={28} />
                                    <strong>Todavía no hay publicaciones</strong>
                                    <p className="muted">Aquí aparecerán los avisos y reuniones de la empresa.</p>
                                </div>
                            ) : (
                                <>
                                    {list.map((post, i) => (
                                        <PostCard
                                            key={post.id}
                                            index={i}
                                            post={overrides[post.id] ?? post}
                                            busy={busyId === post.id}
                                            onRespond={respond}
                                            onEdit={p => setEditing(p)}
                                            onDelete={remove}
                                            onShowResponses={p => setResponsesOf(p)}
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
                    <section className="dashboard-card">
                        <div className="dashboard-card-title">
                            <div>
                                <p className="eyebrow">AGENDA</p>
                                <h2>Próximas reuniones</h2>
                            </div>
                            <span className="dashboard-card-icon">
                                <Icon name="calendar" />
                            </span>
                        </div>

                        <StateView state={upcoming}>
                            {list =>
                                list.length === 0 ? (
                                    <p className="pending-request-empty">No hay reuniones próximas.</p>
                                ) : (
                                    <div className="today-list">
                                        {list.map(m => (
                                            <div className="person-item" key={m.id}>
                                                <div className="mini-date">
                                                    <strong>{new Date(`${m.meeting_date}T00:00:00`).getDate()}</strong>
                                                    <span>
                                                        {new Date(`${m.meeting_date}T00:00:00`).toLocaleDateString('es-MX', { month: 'short' })}
                                                    </span>
                                                </div>

                                                <div className="person-text">
                                                    <strong>{m.title}</strong>
                                                    <span className="cap">
                                                        {longDate(m.meeting_date!)} · {m.start_time}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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
                    post={editing === 'new' ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={reload}
                />
            )}

            {responsesOf && <ResponsesModal token={token} post={responsesOf} onClose={() => setResponsesOf(null)} />}
        </div>
    )
}