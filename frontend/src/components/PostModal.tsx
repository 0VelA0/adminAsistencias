import { useRef, useState } from 'react'
import { api } from '../lib/api'
import { ymd, toMin } from '../lib/format'
import { fileToPostImage } from '../lib/image'
import { useAsync } from '../lib/useAsync'
import type { Post, PostsMeta, Space, Booking } from '../lib/types'
import { Icon } from './Icon'
import { useToast } from './Toast'

type Place = 'none' | 'space' | 'place' | 'online'

export function PostModal({
    token,
    meta,
    post,
    onClose,
    onSaved,
}: {
    token: string
    meta: PostsMeta
    post: Post | null
    onClose: () => void
    onSaved: () => void
}) {
    const toast = useToast()
    const fileRef = useRef<HTMLInputElement>(null)
    const spaces = useAsync(() => api<Space[]>('/spaces', {}, token), [token])

    const audiences = [
        ...(meta.can_target_all ? [{ value: 'all', label: 'Toda la empresa' }] : []),
        ...(meta.has_team ? [{ value: 'team', label: 'Mi equipo (todo el que depende de mí)' }] : []),
        ...meta.departments.map(d => ({ value: `dept:${d}`, label: `Área: ${d}` })),
    ]

    const [kind, setKind] = useState<Post['kind']>(post?.kind ?? 'announcement')
    const [title, setTitle] = useState(post?.title ?? '')
    const [body, setBody] = useState(post?.body ?? '')
    const [image, setImage] = useState<string | null>(post?.image ?? null)
    const [pinned, setPinned] = useState(post?.pinned ?? false)
    const [audience, setAudience] = useState(post?.audience ?? audiences[0]?.value ?? 'all')
    const [date, setDate] = useState(post?.meeting_date ?? ymd(new Date()))
    const [start, setStart] = useState(post?.start_time ?? '10:00')
    const [end, setEnd] = useState(post?.end_time ?? '11:00')
    const [place, setPlace] = useState<Place>(
        post?.space_id ? 'space' : post?.meeting_url ? 'online' : post?.location ? 'place' : 'none'
    )
    const [spaceId, setSpaceId] = useState(post?.space_id ? String(post.space_id) : '')
    const [location, setLocation] = useState(post?.location ?? '')
    const [url, setUrl] = useState(post?.meeting_url ?? '')
    const [busy, setBusy] = useState(false)

    const meeting = kind === 'meeting'

    const pickImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return

        try {
            setImage(await fileToPostImage(file))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo usar la imagen.')
        }
    }

    const roomDay = useAsync(
        () =>
            place === 'space' && spaceId && date
                ? api<Booking[]>(`/bookings?day=${date}`, {}, token)
                : Promise.resolve([] as Booking[]),
        [token, place, spaceId, date]
    )

    const roomBookings = (roomDay.data ?? []).filter(
        b => b.space_id === Number(spaceId) && b.id !== post?.booking_id
    )

    const clash =
        meeting && place === 'space' && spaceId && start < end
            ? roomBookings.find(b => toMin(b.start_time) < toMin(end) && toMin(b.end_time) > toMin(start))
            : undefined

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setBusy(true)

        try {
            await api(
                post ? `/posts/${post.id}` : '/posts',
                {
                    method: post ? 'PUT' : 'POST',
                    body: JSON.stringify({
                        kind,
                        title: title.trim(),
                        body: body.trim(),
                        image,
                        pinned,
                        audience,
                        meeting_date: meeting ? date : null,
                        start_time: meeting ? start : null,
                        end_time: meeting ? end : null,
                        space_id: meeting && place === 'space' && spaceId ? Number(spaceId) : null,
                        location: meeting && place === 'place' ? location.trim() || null : null,
                        meeting_url: meeting && place === 'online' ? url.trim() || null : null,
                    }),
                },
                token
            )

            toast.success(post ? 'Publicación actualizada.' : 'Publicado. Avisamos a tu audiencia.')
            onSaved()
            onClose()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo publicar.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <form className="modal modal-xl" onClick={e => e.stopPropagation()} onSubmit={submit}>
                <p className="eyebrow">COMUNICADOS</p>
                <h2>{post ? 'Editar publicación' : 'Nueva publicación'}</h2>

                <div className="segmented">
                    <button type="button" className={!meeting ? 'active' : ''} onClick={() => setKind('announcement')}>
                        <Icon name="megaphone" size={15} /> Comunicado
                    </button>
                    <button type="button" className={meeting ? 'active' : ''} onClick={() => setKind('meeting')}>
                        <Icon name="calendar" size={15} /> Reunión
                    </button>
                </div>

                <label>
                    Título
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder={meeting ? 'Ej. Junta mensual de resultados' : 'Ej. Nuevo horario de verano'}
                        minLength={3}
                        maxLength={150}
                        required
                    />
                </label>

                <label>
                    {meeting ? 'Descripción o agenda' : 'Mensaje'}
                    <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} maxLength={5000} />
                </label>

                {meeting && (
                    <section className="form-section step-panel">
                        <h3>Cuándo y dónde</h3>

                        <div className="modal-row">
                            <label>
                                Fecha
                                <input type="date" value={date} min={ymd(new Date())} onChange={e => setDate(e.target.value)} required />
                            </label>

                            <div className="modal-row">
                                <label>
                                    Inicio
                                    <input type="time" step={900} value={start} onChange={e => setStart(e.target.value)} required />
                                </label>
                                <label>
                                    Fin
                                    <input type="time" step={900} value={end} onChange={e => setEnd(e.target.value)} required />
                                </label>
                            </div>
                        </div>

                        <div className="segmented">
                            {([
                                ['none', 'Sin lugar'],
                                ['space', 'Sala'],
                                ['place', 'Otro lugar'],
                                ['online', 'En línea'],
                            ] as const).map(([value, label]) => (
                                <button key={value} type="button" className={place === value ? 'active' : ''} onClick={() => setPlace(value)}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {place === 'space' && (
                            <label>
                                Sala
                                <select value={spaceId} onChange={e => setSpaceId(e.target.value)} required>
                                    <option value="">{spaces.data ? 'Elige una sala…' : 'Cargando…'}</option>
                                    {(spaces.data ?? []).map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} · {s.capacity} personas · {s.open_time}–{s.close_time}
                                        </option>
                                    ))}
                                </select>
                                {spaceId && roomDay.data && (
                                    clash ? (
                                        <p className="notice warning">
                                            La sala está ocupada de {clash.start_time} a {clash.end_time} ({clash.title}). Elige otro
                                            horario u otra sala para poder publicar.
                                        </p>
                                    ) : (
                                        <p className="availability">
                                            <Icon name="check" size={14} /> Sala disponible en ese horario. Se reservará al publicar.
                                        </p>
                                    )
                                )}

                                {roomBookings.length > 0 && (
                                    <small>
                                        Ocupada ese día: {roomBookings.map(b => `${b.start_time}–${b.end_time}`).join(', ')}
                                    </small>
                                )}
                            </label>
                        )}

                        {place === 'place' && (
                            <label>
                                Lugar
                                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ej. Comedor, piso 2" maxLength={150} />
                            </label>
                        )}

                        {place === 'online' && (
                            <label>
                                Enlace de la reunión
                                <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" maxLength={300} />
                            </label>
                        )}
                    </section>
                )}

                <section className="form-section">
                    <h3>Imagen (opcional)</h3>

                    {image ? (
                        <div className="post-image-preview">
                            <img src={image} alt="" />
                            <button type="button" className="secondary compact" onClick={() => setImage(null)}>
                                <Icon name="trash" size={14} /> Quitar
                            </button>
                        </div>
                    ) : (
                        <button type="button" className="secondary" onClick={() => fileRef.current?.click()}>
                            <Icon name="image" size={16} /> Agregar imagen
                        </button>
                    )}

                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />
                </section>

                <section className="form-section">
                    <h3>Audiencia</h3>

                    <select value={audience} onChange={e => setAudience(e.target.value)}>
                        {audiences.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>

                    {meta.is_admin && (
                        <label className="check-row">
                            <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
                            Fijar arriba del muro
                        </label>
                    )}
                </section>

                <div className="modal-actions">
                    <button type="button" className="secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={busy || Boolean(clash)}>
                        {busy ? 'Publicando…' : post ? 'Guardar cambios' : 'Publicar'}
                    </button>
                </div>
            </form>
        </div>
    )
}