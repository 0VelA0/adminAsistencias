import { toDate } from './format'
import type { Person } from './types'

export type OrgNode = Person & { children: OrgNode[] }

export function buildTree(people: Person[]): OrgNode[] {
    const nodes = new Map<number, OrgNode>(people.map(p => [p.id, { ...p, children: [] }]))
    const roots: OrgNode[] = []

    for (const node of nodes.values()) {
        const parent = node.manager_id ? nodes.get(node.manager_id) : undefined
        if (parent) parent.children.push(node)
        else roots.push(node)
    }

    const sort = (list: OrgNode[]) => {
        list.sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'))
        list.forEach(n => sort(n.children))
    }

    sort(roots)
    return roots
}

export const countDescendants = (node: OrgNode): number =>
    node.children.reduce((total, child) => total + 1 + countDescendants(child), 0)

export function ancestorsOf(id: number, people: Person[]): number[] {
    const byId = new Map(people.map(p => [p.id, p]))
    const result: number[] = []
    const seen = new Set<number>()
    let current = byId.get(id)?.manager_id ?? null

    while (current && !seen.has(current)) {
        result.push(current)
        seen.add(current)
        current = byId.get(current)?.manager_id ?? null
    }

    return result
}

export function seniority(hireDate: string | null) {
    if (!hireDate) return 'Sin fecha de ingreso'

    const start = toDate(hireDate)
    const now = new Date()
    let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth()
    if (now.getDate() < start.getDate()) months -= 1

    if (months < 1) return 'Menos de un mes'

    const years = Math.floor(months / 12)
    const rest = months % 12
    const parts: string[] = []

    if (years) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`)
    if (rest) parts.push(`${rest} ${rest === 1 ? 'mes' : 'meses'}`)

    return parts.join(' y ')
}

/** Color estable por departamento, para las etiquetas. */
export function deptColors(name: string | null) {
    if (!name) return undefined

    let hash = 0
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 360

    return { background: `hsl(${hash} 70% 94%)`, color: `hsl(${hash} 45% 32%)` }
}

export const uniqueSorted = (values: (string | null)[]) =>
    [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b, 'es'))