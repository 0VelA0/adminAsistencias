import logo from '../assets/logo.png'

export function Logo({ className }: { className?: string }) {
    return <img src={logo} alt="Integradora Profesional" className={className} />
}