import { initials } from '../lib/format'
import type { User } from '../lib/types'

export function Avatar({
    user,
    size = 'md',
}: {
    user: Pick<User, 'full_name' | 'avatar'>
    size?: 'sm' | 'md' | 'lg'
}) {
    return (
        <div className={`avatar avatar-${size}`}>
            {user.avatar ? <img src={user.avatar} alt={user.full_name} /> : initials(user.full_name)}
        </div>
    )
}