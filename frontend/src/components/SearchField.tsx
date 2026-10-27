import { Icon } from './Icon'

export function SearchField({
    value,
    onChange,
    placeholder = 'Buscar…',
}: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
}) {
    return (
        <label className="search-field">
            <Icon name="search" size={16} />

            <input
                type="search"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
            />

            {value && (
                <button type="button" className="search-clear" aria-label="Limpiar búsqueda" onClick={() => onChange('')}>
                    <Icon name="x" size={14} />
                </button>
            )}
        </label>
    )
}