import { useState } from 'react'
import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import type { Post, ResponsePerson } from '../lib/types'
import { Avatar } from './Avatar'
import { StateView } from './StatusBlocks'

const GROUPS = {
    meeting: [
        { key: 'yes', label: 'Asistirán' },
        { key: 'maybe', label: 'Tal vez' },
        { key: 'no', label: 'No asistirán' },
        { key: 'none', label: 'Sin responder' },
    ],
    announcement: [
        { key: 'seen', label: 'Enterados' },
        { key: 'none', label: 'Pendientes' },
    ],
} as const

export function ResponsesModal({ token, post, onClose }: { token: string; post: Post; onClose: () => void }) {
    const people = useAsync(() => api<ResponsePerson[]>(`/posts/${post.id}/responses`, {}, token), [token, post.id])
    const groups = GROUPS[post.kind]
    const [tab, setTab] = useState<string>(groups[0].key)

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                <p className="eyebrow">RESPUESTAS</p>
                <h2>{post.title}</h2>

                <StateView state={people}>
                    {list => {
                        const of = (key: string) => list.filter(p => (p.response ?? 'none') === key)

                        return (
                            <>
                                <div className="filter-tabs">
                                    {groups.map(g => (
                                        <button key={g.key} type="button" className={tab === g.key ? 'active' : ''} onClick={() => setTab(g.key)}>
                                            {g.label} · {of(g.key).length}
                                        </button>
                                    ))}
                                </div>

                                <div className="today-list step-panel" key={tab}>
                                    {of(tab).length === 0 ? (
                                        <p className="empty">Nadie en esta lista.</p>
                                    ) : (
                                        of(tab).map(p => (
                                            <div className="person-item" key={p.user_id}>
                                                <Avatar user={p} size="sm" />
                                                <div className="person-text">
                                                    <strong>{p.full_name}</strong>
                                                    <span>{p.comment ?? p.position ?? ''}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )
                    }}
                </StateView>

                <div className="modal-actions">
                    <button type="button" onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </div>
    )
}