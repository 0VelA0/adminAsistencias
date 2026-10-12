import { useState } from 'react'
import { api } from '../lib/api'
import { DAY_LABELS, timeOptions } from '../lib/format'
import type { Space } from '../lib/types'
import { useToast } from './Toast'

const KIND_SUGGESTIONS = [
    'Sala de juntas',
    'Sala de capacitación',
    'Auditorio',
    'Sala de videollamadas',
    'Cubículo',
    'Área común',
]

const HOURS = timeOptions('05:00', '23:00')

export function SpaceModal({
    token,
    space,
    onClose,
    onSaved,
}: {
    token: string
    space: Space | null
    onClose: () => void
    onSaved: () => void
}) {
    const toast = useToast()

    const [name, setName] = useState(space?.name ?? '')
    const [kind, setKind] = useState(space?.kind ?? KIND_SUGGESTIONS[0])
    const [capacity, setCapacity] = useState(String(space?.capacity ?? 8))
    const [location, setLocation] = useState(space?.location ?? '')
    const [description, setDescription] = useState(space?.description ?? '')
    const [equipment, setEquipment] = useState((space?.equipment ?? []).join(', '))
    const [openTime, setOpenTime] = useState(space?.open_time ?? '08:00')
    const [closeTime, setCloseTime] = useState(space?.close_time ?? '19:00')
    const [days, setDays] = useState<number[]>(space?.open_days ?? [0, 1, 2, 3, 4])
    const [active, setActive] = useState(space?.is_active ?? true)
    const [saving, setSaving] = useState(false)

    const toggleDay = (day: number) =>
        setDays(current =>
            current.includes(day) ? current.filter(d => d !== day) : [...current, day].sort()
        )

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()

        if (!days.length) return toast.error('Elige al menos un día de apertura.')

        setSaving(true)

        try {
            await api(
                space ? `/spaces/${space.id}` : '/spaces',
                {
                    method: space ? 'PUT' : 'POST',
                    body: JSON.stringify({
                        name: name.trim(),
                        kind: kind.trim(),
                        capacity: Number(capacity),
                        location: location.trim() || null,
                        description: description.trim() || null,
                        equipment: equipment.split(',').map(item => item.trim()).filter(Boolean),
                        open_time: openTime,
                        close_time: closeTime,
                        open_days: days,
                        is_active: active,
                    }),
                },
                token
            )

            toast.success(space ? 'Espacio actualizado.' : 'Espacio creado.')
            onSaved()
            onClose()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo guardar el espacio.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <form className="modal modal-wide" onClick={e => e.stopPropagation()} onSubmit={submit}>
                <p className="eyebrow">ESPACIOS</p>
                <h2>{space ? 'Editar espacio' : 'Nuevo espacio'}</h2>

                <label>
                    Nombre
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Sala Reforma" minLength={2} maxLength={100} required />
                </label>

                <div className="modal-row">
                    <label>
                        Tipo
                        <input list="space-kinds" value={kind} onChange={e => setKind(e.target.value)} minLength={2} maxLength={60} required />
                        <datalist id="space-kinds">
                            {KIND_SUGGESTIONS.map(item => (
                                <option key={item} value={item} />
                            ))}
                        </datalist>
                    </label>

                    <label>
                        Capacidad (personas)
                        <input type="number" min={1} max={1000} value={capacity} onChange={e => setCapacity(e.target.value)} required />
                    </label>
                </div>

                <label>
                    Ubicación
                    <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ej. Piso 2, ala norte" maxLength={150} />
                </label>

                <label>
                    Equipamiento (separado por comas)
                    <input value={equipment} onChange={e => setEquipment(e.target.value)} placeholder="Proyector, Pizarrón, Videoconferencia" />
                </label>

                <label>
                    Descripción
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={500} />
                </label>

                <div className="modal-row">
                    <label>
                        Abre
                        <select value={openTime} onChange={e => setOpenTime(e.target.value)}>
                            {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </label>

                    <label>
                        Cierra
                        <select value={closeTime} onChange={e => setCloseTime(e.target.value)}>
                            {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </label>
                </div>

                <div className="field-group">
                    <span className="field-label">Días de apertura</span>

                    <div className="day-picker">
                        {DAY_LABELS.map((label, day) => (
                            <button
                                key={day}
                                type="button"
                                className={days.includes(day) ? '' : 'secondary'}
                                onClick={() => toggleDay(day)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {space && (
                    <label className="check-row">
                        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
                        Espacio activo (disponible para reservar)
                    </label>
                )}

                <div className="modal-actions">
                    <button type="button" className="secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={saving}>
                        {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>
    )
}