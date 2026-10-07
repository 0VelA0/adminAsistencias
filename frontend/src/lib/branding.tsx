import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api'
import type { Branding } from './types'

export const DEFAULT_BRANDING: Branding = {
    company_name: 'Integradora Profesional',
    logo: null,
    primary_color: '#2463d4',
    sidebar_color: '#071526',
}

const CACHE_KEY = 'branding_cache'

function readableOn(hex: string) {
    const n = parseInt(hex.slice(1), 16)
    const r = (n >> 16) & 255
    const g = (n >> 8) & 255
    const b = n & 255

    return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#172033' : '#ffffff'
}

export function applyTheme(
    colors: Pick<Branding, 'primary_color' | 'sidebar_color'>
) {
    const style = document.documentElement.style

    style.setProperty('--primary', colors.primary_color)
    style.setProperty('--on-primary', readableOn(colors.primary_color))
    style.setProperty('--sidebar', colors.sidebar_color)
    style.setProperty('--on-sidebar', readableOn(colors.sidebar_color))
}

function readCache(): Branding {
    try {
        const raw = localStorage.getItem(CACHE_KEY)
        return raw ? { ...DEFAULT_BRANDING, ...JSON.parse(raw) } : DEFAULT_BRANDING
    } catch {
        return DEFAULT_BRANDING
    }
}

type BrandingContextValue = {
    branding: Branding
    setBranding: (branding: Branding) => void
}

const BrandingContext = createContext<BrandingContextValue>({
    branding: DEFAULT_BRANDING,
    setBranding: () => undefined,
})

export function BrandingProvider({ children }: { children: React.ReactNode }) {
    const [branding, setState] = useState<Branding>(readCache)

    const setBranding = (next: Branding) => {
        setState(next)

        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(next))
        } catch {
            /* sin caché, no pasa nada */
        }
    }

    useEffect(() => {
        api<Branding>('/branding', {}, '').then(setBranding).catch(() => undefined)
    }, [])

    useEffect(() => {
        applyTheme(branding)
        document.title = branding.company_name
    }, [branding])

    return (
        <BrandingContext.Provider value={{ branding, setBranding }}>
            {children}
        </BrandingContext.Provider>
    )
}

export const useBranding = () => useContext(BrandingContext)