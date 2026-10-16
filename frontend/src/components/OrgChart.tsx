import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ancestorsOf, buildTree, countDescendants, deptColors } from '../lib/people'
import type { OrgNode } from '../lib/people'
import type { Person } from '../lib/types'
import { Avatar } from './Avatar'
import { Icon } from './Icon'

const MIN_SCALE = 0.4
const MAX_SCALE = 1.6

function offsetWithin(element: HTMLElement, container: HTMLElement) {
    let x = 0
    let y = 0
    let node: HTMLElement | null = element

    while (node && node !== container) {
        x += node.offsetLeft
        y += node.offsetTop
        node = node.offsetParent as HTMLElement | null
    }

    return { x, y }
}

type BranchProps = {
    node: OrgNode
    expanded: Set<number>
    highlight: number | null
    onToggle: (id: number) => void
    onSelect: (person: Person) => void
}

function Branch({ node, expanded, highlight, onToggle, onSelect }: BranchProps) {
    const open = expanded.has(node.id)

    return (
        <li>
            <div className="org-node">
                <button
                    type="button"
                    data-person={node.id}
                    className={`org-card ${highlight === node.id ? 'focused' : ''}`}
                    onClick={() => onSelect(node)}
                >
                    <Avatar user={node} size="md" />
                    <strong>{node.full_name}</strong>
                    <span className="org-position">{node.position ?? 'Sin puesto asignado'}</span>
                    {node.department && (
                        <span className="dept-chip" style={deptColors(node.department)}>
                            {node.department}
                        </span>
                    )}
                </button>

                {node.children.length > 0 && (
                    <button
                        type="button"
                        className={`org-toggle ${open ? 'open' : ''}`}
                        aria-expanded={open}
                        aria-label={`${open ? 'Ocultar' : 'Mostrar'} ${node.children.length} reportes directos`}
                        onClick={() => onToggle(node.id)}
                    >
                        {node.children.length}
                        <Icon name="chevron" size={12} />
                    </button>
                )}
            </div>

            {open && node.children.length > 0 && (
                <ul>
                    {node.children.map(child => (
                        <Branch
                            key={child.id}
                            node={child}
                            expanded={expanded}
                            highlight={highlight}
                            onToggle={onToggle}
                            onSelect={onSelect}
                        />
                    ))}
                </ul>
            )}
        </li>
    )
}

export function OrgChart({
    people,
    focus,
    onSelect,
}: {
    people: Person[]
    focus: { id: number; key: number } | null
    onSelect: (person: Person) => void
}) {
    const roots = useMemo(
        () => buildTree(people).sort((a, b) => countDescendants(b) - countDescendants(a)),
        [people]
    )

    const [expanded, setExpanded] = useState(() => new Set(roots.map(r => r.id)))
    const [view, setView] = useState({ x: 0, y: 24, scale: 1 })
    const [smooth, setSmooth] = useState(false)
    const [dragging, setDragging] = useState(false)
    const [highlight, setHighlight] = useState<number | null>(null)
    const [pending, setPending] = useState<number | null>(null)
    const [query, setQuery] = useState('')

    const viewportRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLDivElement>(null)

    /** Centra el organigrama, o una persona si se indica. */
    const fitTo = useCallback((targetId: number | null, animate = true) => {
        const viewport = viewportRef.current
        const canvas = canvasRef.current
        if (!viewport || !canvas) return

        setSmooth(animate)
        setView(({ scale }) => {
            const target = targetId ? canvas.querySelector<HTMLElement>(`[data-person="${targetId}"]`) : null

            if (target) {
                const { x, y } = offsetWithin(target, canvas)

                return {
                    scale,
                    x: viewport.clientWidth / 2 - (x + target.offsetWidth / 2) * scale,
                    y: viewport.clientHeight / 2 - (y + target.offsetHeight / 2) * scale,
                }
            }

            return { scale, x: (viewport.clientWidth - canvas.offsetWidth * scale) / 2, y: 24 }
        })
    }, [])

    useLayoutEffect(() => fitTo(null, false), [fitTo])

    const focusOn = useCallback(
        (id: number) => {
            setExpanded(prev => new Set([...prev, ...ancestorsOf(id, people)]))
            setPending(id)
        },
        [people]
    )

    useEffect(() => {
        if (focus) focusOn(focus.id)
    }, [focus, focusOn])

    // Espera a que la rama se dibuje y luego centra
    useEffect(() => {
        if (pending === null) return

        const frame = requestAnimationFrame(() => {
            fitTo(pending)
            setHighlight(pending)
            setPending(null)
        })

        return () => cancelAnimationFrame(frame)
    }, [pending, expanded, fitTo])

    useEffect(() => {
        if (highlight === null) return

        const timer = setTimeout(() => setHighlight(null), 2600)
        return () => clearTimeout(timer)
    }, [highlight])

    const zoom = useCallback((factor: number, originX?: number, originY?: number, animate = true) => {
        const viewport = viewportRef.current
        if (!viewport) return

        setSmooth(animate)
        setView(current => {
            const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * factor))
            const ox = originX ?? viewport.clientWidth / 2
            const oy = originY ?? viewport.clientHeight / 2
            const ratio = scale / current.scale

            return { scale, x: ox - (ox - current.x) * ratio, y: oy - (oy - current.y) * ratio }
        })
    }, [])

    // Zoom con la rueda, hacia donde apunta el ratón
    useEffect(() => {
        const viewport = viewportRef.current
        if (!viewport) return

        const onWheel = (event: WheelEvent) => {
            event.preventDefault()
            const rect = viewport.getBoundingClientRect()
            zoom(event.deltaY < 0 ? 1.1 : 1 / 1.1, event.clientX - rect.left, event.clientY - rect.top, false)
        }

        viewport.addEventListener('wheel', onWheel, { passive: false })
        return () => viewport.removeEventListener('wheel', onWheel)
    }, [zoom])

    // Arrastrar para moverse (no empieza sobre tarjetas ni botones)
    const startDrag = (event: React.PointerEvent) => {
        if ((event.target as HTMLElement).closest('button, input')) return

        const origin = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y }
        setSmooth(false)

        const move = (e: PointerEvent) => {
            setDragging(true)
            setView(v => ({ ...v, x: origin.vx + e.clientX - origin.x, y: origin.vy + e.clientY - origin.y }))
        }

        const up = () => {
            setDragging(false)
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', up)
        }

        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
    }

    const toggle = (id: number) =>
        setExpanded(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })

    const setAll = (ids: number[]) => {
        setExpanded(new Set(ids))
        requestAnimationFrame(() => fitTo(null))
    }

    const q = query.trim().toLowerCase()
    const matches = q
        ? people
              .filter(p => `${p.full_name} ${p.position ?? ''} ${p.department ?? ''}`.toLowerCase().includes(q))
              .slice(0, 6)
        : []

    return (
        <div className="org-chart">
            <div className="org-toolbar">
                <div className="org-search">
                    <Icon name="search" size={16} />
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Buscar persona, puesto o área…"
                        aria-label="Buscar en el organigrama"
                    />

                    {matches.length > 0 && (
                        <div className="org-results">
                            {matches.map(p => (
                                <button
                                    type="button"
                                    key={p.id}
                                    onClick={() => {
                                        setQuery('')
                                        focusOn(p.id)
                                    }}
                                >
                                    <Avatar user={p} size="sm" />
                                    <span>
                                        <strong>{p.full_name}</strong>
                                        <small>{p.position ?? 'Sin puesto asignado'}</small>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="org-actions">
                    <button type="button" className="secondary compact" onClick={() => setAll(people.map(p => p.id))}>
                        Expandir todo
                    </button>
                    <button type="button" className="secondary compact" onClick={() => setAll(roots.map(r => r.id))}>
                        Contraer
                    </button>
                </div>
            </div>

            <div ref={viewportRef} className={`org-viewport ${dragging ? 'dragging' : ''}`} onPointerDown={startDrag}>
                <div
                    ref={canvasRef}
                    className={`org-canvas ${smooth ? 'smooth' : ''}`}
                    style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
                >
                    <ul className="org-tree">
                        {roots.map(root => (
                            <Branch
                                key={root.id}
                                node={root}
                                expanded={expanded}
                                highlight={highlight}
                                onToggle={toggle}
                                onSelect={onSelect}
                            />
                        ))}
                    </ul>
                </div>

                <div className="org-controls">
                    <button type="button" className="secondary" aria-label="Acercar" onClick={() => zoom(1.2)}>
                        <Icon name="plus" />
                    </button>
                    <button type="button" className="secondary" aria-label="Alejar" onClick={() => zoom(1 / 1.2)}>
                        <Icon name="minus" />
                    </button>
                    <button type="button" className="secondary" aria-label="Centrar" onClick={() => fitTo(null)}>
                        <Icon name="target" />
                    </button>
                </div>

                <span className="org-zoom">{Math.round(view.scale * 100)}%</span>
            </div>
        </div>
    )
}