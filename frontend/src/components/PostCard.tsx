import { useState } from 'react'
import { longDate, timeAgo, ymd } from '../lib/format'
import type { Post } from '../lib/types'
import { ActionMenu } from './ActionMenu'
import type { MenuItem } from './ActionMenu'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { ImageLightbox } from './ImageLightbox'

const URL_RE = /(https?:\/\/[^\s]+)/g

function Linkified({ text }: { text: string }) {
    return (
        <>
            {text.split(URL_RE).map((part, i) =>
                i % 2 ? (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer">
                        {part}
                    </a>
                ) : (
                    part
                )
            )}
        </>
    )
}

const RSVP = [
    { value: 'yes', label: 'Asistiré' },
    { value: 'maybe', label: 'Tal vez' },
    { value: 'no', label: 'No asistiré' },
] as const

export function PostCard({
    post,
    index = 0,
    busy = false,
    isAdmin = false,
    onRespond,
    onEdit,
    onDelete,
    onShowResponses,
    onToggleFeed,
    onArchive,
}: {
    post: Post
    index?: number
    busy?: boolean
    isAdmin?: boolean
    onRespond: (post: Post, response: string) => void
    onEdit?: (post: Post) => void
    onDelete?: (post: Post) => void
    onShowResponses?: (post: Post) => void
    onToggleFeed?: (post: Post, inFeed: boolean) => void
    onArchive?: (post: Post, archived: boolean) => void
}) {
    const [expanded, setExpanded] = useState(false)
    const [viewer, setViewer] = useState(false)

    const meeting = post.kind === 'meeting'
    const past = meeting && (post.finished || (post.meeting_date !== null && post.meeting_date < ymd(new Date())))
    const long = post.body.length > 420
    const body = long && !expanded ? `${post.body.slice(0, 400).trimEnd()}…` : post.body

    const menu: MenuItem[] = [
        ...(post.can_manage && onEdit ? [{ label: 'Editar', icon: 'edit' as const, onSelect: () => onEdit(post) }] : []),
        ...(post.can_manage && onShowResponses
            ? [{ label: 'Ver respuestas', hint: 'Quién confirmó o leyó', icon: 'users' as const, onSelect: () => onShowResponses(post) }]
            : []),
        ...(isAdmin && onArchive
            ? [{
                  label: post.admin_archived ? 'Desarchivar' : 'Archivar',
                  hint: post.admin_archived ? 'Vuelve al feed de todos' : 'Sale del feed de todos',
                  icon: 'bookmark' as const,
                  onSelect: () => onArchive(post, !post.admin_archived),
              }]
            : []),
        ...(post.can_manage && onDelete
            ? [{ label: 'Eliminar', icon: 'trash' as const, danger: true, dividerBefore: true, onSelect: () => onDelete(post) }]
            : []),
    ]

    return (
        <article
            className={`post-card ${post.pinned ? 'pinned' : ''} ${post.archived ? 'archived' : ''}`}
            style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
        >
            <header className="post-head">
                <span className="post-avatar">
                    <Avatar user={post.author} size="md" />
                </span>

                <div className="post-author">
                    <strong>{post.author.full_name}</strong>
                    <span>{[post.author.position, timeAgo(post.created_at)].filter(Boolean).join(' · ')}</span>
                </div>

                <div className="post-tags">
                    {!post.seen && <span className="badge new-badge">Nuevo</span>}
                    {post.pinned && (
                        <span className="badge admin">
                            <Icon name="bookmark" size={11} /> Fijado
                        </span>
                    )}
                    <span className="badge employee">{post.audience_label}</span>
                </div>

                {menu.length > 0 && <ActionMenu label={`Opciones de "${post.title}"`} items={menu} />}
            </header>

            {post.archived && (
                <div className="post-archived-note">
                    <Icon name="bookmark" size={13} />
                    {post.admin_archived ? 'Archivado por un administrador.' : 'Reunión terminada, archivada automáticamente.'}

                    {onToggleFeed && (
                        <button type="button" className="link" onClick={() => onToggleFeed(post, true)}>
                            Regresar a mi feed
                        </button>
                    )}
                </div>
            )}

            <p className={`post-kind ${meeting ? 'meeting' : ''}`}>
                <Icon name={meeting ? 'calendar' : 'megaphone'} size={13} />
                {meeting ? 'Reunión' : 'Comunicado'}
            </p>

            <h3 className="post-title">{post.title}</h3>

            {meeting && post.meeting_date && (
                <div className={`meeting-box ${past ? 'past' : ''}`}>
                    <div className="meeting-date">
                        <strong>{new Date(`${post.meeting_date}T00:00:00`).getDate()}</strong>
                        <span>{new Date(`${post.meeting_date}T00:00:00`).toLocaleDateString('es-MX', { month: 'short' })}</span>
                    </div>

                    <div className="meeting-info">
                        <strong className="cap">{longDate(post.meeting_date)}</strong>
                        <span><Icon name="clock" size={13} /> {post.start_time}–{post.end_time}</span>
                        {post.space_name && <span><Icon name="building" size={13} /> {post.space_name} (sala reservada)</span>}
                        {post.location && <span><Icon name="pin" size={13} /> {post.location}</span>}
                        {post.meeting_url && (
                            <a href={post.meeting_url} target="_blank" rel="noopener noreferrer">
                                <Icon name="video" size={13} /> Unirse en línea
                            </a>
                        )}
                    </div>

                    {past && <span className="badge cancelled">Finalizada</span>}
                </div>
            )}

            {post.body && (
                <p className="post-body">
                    <Linkified text={body} />
                    {long && (
                        <button type="button" className="link" onClick={() => setExpanded(v => !v)}>
                            {expanded ? 'Ver menos' : 'Ver más'}
                        </button>
                    )}
                </p>
            )}

            {post.image && (
                <button type="button" className="post-image-button" aria-label="Ver imagen completa" onClick={() => setViewer(true)}>
                    <img className="post-image" src={post.image} alt="" loading="lazy" />
                    <span className="post-image-hint">
                        <Icon name="plus" size={14} /> Ver completa
                    </span>
                </button>
            )}

            {viewer && post.image && <ImageLightbox src={post.image} alt={post.title} onClose={() => setViewer(false)} />}

            <footer className="post-foot">
                {meeting ? (
                    <div className="rsvp">
                        {RSVP.map(option => (
                            <button
                                key={option.value}
                                type="button"
                                disabled={busy || past}
                                className={`rsvp-${option.value} ${post.my_response === option.value ? 'active' : ''}`}
                                onClick={() => onRespond(post, post.my_response === option.value ? 'clear' : option.value)}
                            >
                                {option.label}
                                <span>{post.counts[option.value] ?? 0}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <button
                        type="button"
                        disabled={busy}
                        className={`ack ${post.my_response === 'seen' ? 'active' : ''}`}
                        onClick={() => onRespond(post, post.my_response === 'seen' ? 'clear' : 'seen')}
                    >
                        <Icon name="check" size={15} />
                        {post.my_response === 'seen' ? 'Enterado' : 'Marcar como enterado'}
                    </button>
                )}

                {post.can_manage && onShowResponses ? (
                    <button type="button" className="link" onClick={() => onShowResponses(post)}>
                        {meeting
                            ? `${post.counts.yes ?? 0} de ${post.audience_size} confirmaron`
                            : `${post.counts.seen ?? 0} de ${post.audience_size} enterados`}
                    </button>
                ) : (
                    <small>{meeting ? `${post.counts.yes ?? 0} asistirán` : `${post.counts.seen ?? 0} enterados`}</small>
                )}
            </footer>
        </article>
    )
}