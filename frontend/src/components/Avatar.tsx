import { initials } from '../lib/format'
import type { User } from '../lib/types'

export function Avatar({
    user,
    className,
}: {
    user: Pick<User, 'full_name' | 'avatar'>
    className: string
}) {
    return (
        <div className={className}>
            {user.avatar ? (
                <img src={user.avatar} alt={user.full_name} />
            ) : (
                initials(user.full_name)
            )}
        </div>
    )
}