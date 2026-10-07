import defaultLogo from '../assets/logo.png'
import { useBranding } from '../lib/branding'

export function Logo({ className }: { className?: string }) {
    const { branding } = useBranding()

    return (
        <img
            src={branding.logo ?? defaultLogo}
            alt={branding.company_name}
            className={className}
        />
    )
}