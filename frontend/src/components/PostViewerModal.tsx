import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../lib/api'
import { emit } from '../lib/events'
import type { Post } from '../lib/types'
import { Icon } from './Icon'
import { PostCard } from './PostCard'
import { useToast } from './Toast'

export function PostViewerModal({
    token,
    post,
    onClose,
    onOpenAll,
}: {
    token: string
    post: Post
    onClose: () => void
    onOpenAll: () => void
}) {
    const toast = useToast()
    const [current, setCurrent] = useState(post)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (!post.seen) {
            api('/posts/seen', { method: 'POST', body: JSON.stringify({ ids: [post.id] }) }, token)
                .then(() => emit('posts:changed'))
                .catch(() => undefined)
        }

        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [post.id, post.seen, token, onClose])

    const respond = async (_: Post, response: string) => {
        setBusy(true)

        try {
            setCurrent(await api<Post>(`/posts/${post.id}/respond`, { method: 'POST', body: JSON.stringify({ response }) }, token))
            emit('posts:changed')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo guardar tu respuesta.')
        } finally {
            setBusy(false)
        }
    }

    return createPortal(
        <div className="modal-backdrop post-viewer" onClick={onClose}>
            <div className="post-viewer-dialog" role="dialog" aria-modal="true" aria-label={post.title} onClick={e => e.stopPropagation()}>
                <div className="post-viewer-bar">
                    <button type="button" className="link" onClick={onOpenAll}>
                        Ver todos los comunicados <Icon name="right" size={14} />
                    </button>
                    <button type="button" className="secondary compact post-viewer-close" aria-label="Cerrar" onClick={onClose}>
                        <Icon name="x" size={16} />
                    </button>
                </div>

                <PostCard post={{ ...current, seen: true }} busy={busy} onRespond={respond} />
            </div>
        </div>,
        document.body
    )
}