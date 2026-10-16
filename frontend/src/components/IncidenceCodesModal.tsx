import { useState } from 'react'
import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import type { IncidenceCode } from '../lib/types'
import { StateView } from './StatusBlocks'
import { useToast } from './Toast'

function CodesForm({
    token,
    initial,
    onClose,
    onSaved,
}: {
    token: string
    initial: IncidenceCode[]
    onClose: () => void
    onSaved: () => void
}) {
    const toast = useToast()
    const [rows, setRows] = useState(initial)
    const [saving, setSaving] = useState(false)

    const update = (index: number, patch: Partial<IncidenceCode>) =>
        setRows(current => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))

    const codes = rows.map(r => r.code.trim().toUpperCase())
    const duplicated = (code: string) => codes.filter(c => c === code).length > 1
    const invalid = rows.some(r => !/^[A-Z0-9]{1,10}$/.test(r.code.trim().toUpperCase()) || r.label.trim().length < 2)
    const hasDuplicates = codes.some(duplicated)

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setSaving(true)

        try {
            await api(
                '/reports/codes',
                {
                    method: 'PUT',
                    body: JSON.stringify(
                        rows.map(({ key, code, label, include_in_incidences }) => ({
                            key,
                            code: code.trim().toUpperCase(),
                            label: label.trim(),
                            include_in_incidences,
                        }))
                    ),
                },
                token
            )

            toast.success('Claves de incidencia actualizadas.')
            onSaved()
            onClose()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudieron guardar las claves.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <form className="modal-form" onSubmit={submit}>
            <p className="eyebrow">REPORTES</p>
            <h2>Claves de incidencia</h2>

            <p className="muted report-note">
                Usa las mismas claves que en tu hoja de nómina. Las marcadas aparecen en la hoja
                <strong> Incidencias</strong> del Excel.
            </p>

            <div className="table-card">
                <div className="table-scroll">
                    <table className="data-table codes-table">
                        <thead>
                            <tr>
                                <th>Clave</th>
                                <th>Descripción</th>
                                <th>En incidencias</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map((row, i) => (
                                <tr key={row.key}>
                                    <td data-label="Clave">
                                        <input
                                            className={`code-input ${duplicated(codes[i]) ? 'invalid' : ''}`}
                                            style={{ background: row.color }}
                                            value={row.code}
                                            maxLength={10}
                                            onChange={e => update(i, { code: e.target.value.toUpperCase() })}
                                            aria-label={`Clave para ${row.label}`}
                                        />
                                    </td>
                                    <td data-label="Descripción">
                                        <input value={row.label} maxLength={80} onChange={e => update(i, { label: e.target.value })} />
                                    </td>
                                    <td data-label="En incidencias">
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={row.include_in_incidences}
                                                onChange={e => update(i, { include_in_incidences: e.target.checked })}
                                            />
                                            <span />
                                        </label>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {hasDuplicates && <p className="error">Cada clave debe ser única.</p>}

            <div className="modal-actions">
                <button type="button" className="secondary" onClick={onClose}>
                    Cancelar
                </button>
                <button type="submit" disabled={saving || invalid || hasDuplicates}>
                    {saving ? 'Guardando…' : 'Guardar claves'}
                </button>
            </div>
        </form>
    )
}

export function IncidenceCodesModal({
    token,
    onClose,
    onSaved,
}: {
    token: string
    onClose: () => void
    onSaved: () => void
}) {
    const codes = useAsync(() => api<IncidenceCode[]>('/reports/codes', {}, token), [token])

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                <StateView state={codes}>
                    {list => <CodesForm token={token} initial={list} onClose={onClose} onSaved={onSaved} />}
                </StateView>
            </div>
        </div>
    )
}