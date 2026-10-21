import { useRef, useState } from 'react'
import { api } from '../lib/api'
import { downloadBase64, downloadCsv, fileToBase64 } from '../lib/files'
import type { ImportResult } from '../lib/types'
import { Icon } from './Icon'
import { useToast } from './Toast'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const STEPS = ['Archivo', 'Revisión', 'Listo']

const ACTION = {
    create: { label: 'Nueva', badge: 'approved' },
    update: { label: 'Actualizar', badge: 'admin' },
    error: { label: 'Con errores', badge: 'rejected' },
} as const

export function ImportPeopleModal({
    token,
    onClose,
    onImported,
}: {
    token: string
    onClose: () => void
    onImported: () => void
}) {
    const toast = useToast()
    const inputRef = useRef<HTMLInputElement>(null)

    const [step, setStep] = useState(0)
    const [fileName, setFileName] = useState('')
    const [content, setContent] = useState('')
    const [result, setResult] = useState<ImportResult | null>(null)
    const [busy, setBusy] = useState(false)
    const [dragging, setDragging] = useState(false)

    const fail = (error: unknown, fallback: string) =>
        toast.error(error instanceof Error ? error.message : fallback)

    const downloadTemplate = async () => {
        try {
            const file = await api<{ filename: string; content: string }>('/people/import/template', {}, token)
            downloadBase64(file.filename, file.content, XLSX_MIME)
        } catch (error) {
            fail(error, 'No se pudo descargar la plantilla.')
        }
    }

    const pick = async (file: File | undefined) => {
        if (!file) return
        if (!file.name.toLowerCase().endsWith('.xlsx')) return toast.error('Usa un archivo .xlsx (la plantilla).')
        if (file.size > 2_000_000) return toast.error('El archivo supera 2 MB.')

        setBusy(true)

        try {
            const base64 = await fileToBase64(file)

            const preview = await api<ImportResult>(
                '/people/import',
                { method: 'POST', body: JSON.stringify({ content: base64, dry_run: true }) },
                token
            )

            if (!preview.rows.length) return toast.error('El archivo no tiene filas con datos.')

            setFileName(file.name)
            setContent(base64)
            setResult(preview)
            setStep(1)
        } catch (error) {
            fail(error, 'No se pudo revisar el archivo.')
        } finally {
            setBusy(false)
        }
    }

    const apply = async () => {
        setBusy(true)

        try {
            const done = await api<ImportResult>(
                '/people/import',
                { method: 'POST', body: JSON.stringify({ content, dry_run: false }) },
                token
            )

            setResult(done)
            setStep(2)
            onImported()
            toast.success(`Importación completa: ${done.created} nuevas, ${done.updated} actualizadas.`)
        } catch (error) {
            fail(error, 'No se pudo importar.')
        } finally {
            setBusy(false)
        }
    }

    const restart = () => {
        setStep(0)
        setResult(null)
        setContent('')
        setFileName('')
    }

    return (
        // En el paso final no se cierra al hacer clic afuera: las contraseñas solo se muestran una vez
        <div className="modal-backdrop" onClick={step === 2 ? undefined : onClose}>
            <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
                <p className="eyebrow">PERSONAL</p>
                <h2>Importar personal desde Excel</h2>

                <ol className="stepper" style={{ '--progress': step / (STEPS.length - 1) } as React.CSSProperties}>
                    {STEPS.map((label, i) => (
                        <li key={label} className={i < step ? 'done' : i === step ? 'active' : ''}>
                            <span className="step-dot">{i < step ? <Icon name="check" size={14} /> : i + 1}</span>
                            <span className="step-label">{label}</span>
                        </li>
                    ))}
                </ol>

                <div className="step-panel" key={step}>
                    {step === 0 && (
                        <>
                            <p className="muted">
                                Descarga la plantilla, llénala siguiendo la hoja <strong>Instrucciones</strong> y
                                súbela aquí. Revisaremos cada fila antes de guardar algo.
                            </p>

                            <button type="button" className="secondary" onClick={downloadTemplate}>
                                <Icon name="download" size={16} /> Descargar plantilla
                            </button>

                            <label
                                className={`dropzone ${dragging ? 'dragging' : ''}`}
                                onDragOver={e => {
                                    e.preventDefault()
                                    setDragging(true)
                                }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={e => {
                                    e.preventDefault()
                                    setDragging(false)
                                    pick(e.dataTransfer.files[0])
                                }}
                            >
                                {busy ? <span className="spinner" /> : <Icon name="upload" size={28} />}
                                <strong>{busy ? 'Revisando archivo…' : 'Arrastra tu archivo aquí'}</strong>
                                <span>o haz clic para elegirlo (.xlsx, máximo 2 MB)</span>

                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept=".xlsx"
                                    hidden
                                    disabled={busy}
                                    onChange={e => {
                                        pick(e.target.files?.[0])
                                        e.target.value = ''
                                    }}
                                />
                            </label>
                        </>
                    )}

                    {step === 1 && result && (
                        <>
                            <p className="muted">
                                <strong>{fileName}</strong>: {result.rows.length} filas revisadas.
                            </p>

                            <div className="import-summary">
                                <span className="badge approved">{result.created} nuevas</span>
                                <span className="badge admin">{result.updated} por actualizar</span>
                                {result.failed > 0 && <span className="badge rejected">{result.failed} con errores</span>}
                            </div>

                            <div className="table-card">
                                <div className="table-scroll">
                                    <table className="data-table import-table">
                                        <thead>
                                            <tr>
                                                <th>Fila</th>
                                                <th>Persona</th>
                                                <th>Acción</th>
                                                <th>Detalle</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {result.rows.map(row => (
                                                <tr key={row.row} className={row.action === 'error' ? 'row-error' : ''}>
                                                    <td data-label="Fila">{row.row}</td>
                                                    <td data-label="Persona">
                                                        <strong>{row.full_name || '—'}</strong>
                                                        <small className="cell-sub">{row.email || 'sin correo'}</small>
                                                    </td>
                                                    <td data-label="Acción">
                                                        <span className={`badge ${ACTION[row.action].badge}`}>{ACTION[row.action].label}</span>
                                                    </td>
                                                    <td data-label="Detalle">
                                                        {row.errors.length ? (
                                                            <ul className="error-list">
                                                                {row.errors.map(e => <li key={e}>{e}</li>)}
                                                            </ul>
                                                        ) : (
                                                            'Listo para importar'
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {result.failed > 0 && (
                                <p className="notice warning">
                                    Corrige las filas marcadas en tu archivo y vuelve a subirlo. No se guarda nada
                                    hasta que todas estén correctas.
                                </p>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="secondary" onClick={restart}>
                                    Elegir otro archivo
                                </button>
                                <button type="button" onClick={apply} disabled={busy || result.failed > 0}>
                                    {busy ? 'Importando…' : `Importar ${result.rows.length} personas`}
                                </button>
                            </div>
                        </>
                    )}

                    {step === 2 && result && (
                        <div className="done-panel">
                            <div className="success-mark">
                                <Icon name="check" size={30} />
                            </div>
                            <h3>Importación completa</h3>

                            <p className="muted">
                                {result.created} personas nuevas y {result.updated} actualizadas.
                            </p>

                            {result.credentials.length > 0 && (
                                <>
                                    <p className="notice warning">
                                        Estas contraseñas temporales <strong>solo se muestran ahora</strong>. Descárgalas y
                                        compártelas por un medio seguro.
                                    </p>

                                    <div className="table-card">
                                        <div className="table-scroll">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Nombre</th>
                                                        <th>Correo</th>
                                                        <th>Contraseña temporal</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {result.credentials.map(c => (
                                                        <tr key={c.email}>
                                                            <td data-label="Nombre">{c.full_name}</td>
                                                            <td data-label="Correo">{c.email}</td>
                                                            <td data-label="Contraseña"><code>{c.temporary_password}</code></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="secondary"
                                        onClick={() =>
                                            downloadCsv('credenciales-personal.csv', [
                                                ['Nombre', 'Correo', 'Contraseña temporal'],
                                                ...result.credentials.map(c => [c.full_name, c.email, c.temporary_password]),
                                            ])
                                        }
                                    >
                                        <Icon name="download" size={16} /> Descargar credenciales (CSV)
                                    </button>
                                </>
                            )}

                            <div className="modal-actions">
                                <button type="button" onClick={onClose}>Listo</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}