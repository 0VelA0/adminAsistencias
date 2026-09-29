import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { api } from './lib/api'

import type {
    AttendanceRecord,
    AttendanceToday,
    User,
} from './lib/types'

import { AppHeader } from './components/AppHeader'
import { LoginPage } from './pages/LoginPage'
import { EmployeePage } from './pages/EmployeePage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'

import './styles.css'


function App() {
    const [token, setToken] = useState(
        localStorage.getItem(
            'attendance_token'
        ) || ''
    )

    const [user, setUser] =
        useState<User | null>(null)

    const [records, setRecords] =
        useState<AttendanceRecord[]>([])

    const [today, setToday] =
        useState<AttendanceToday | null>(null)

    const [adminView, setAdminView] =
        useState(false)


    const load = async (
        activeToken = token
    ) => {
        try {
            const [
                me,
                mine,
                attendanceToday,
            ] = await Promise.all([
                api<User>(
                    '/auth/me',
                    {},
                    activeToken
                ),

                api<AttendanceRecord[]>(
                    '/attendance/mine',
                    {},
                    activeToken
                ),

                api<AttendanceToday>(
                    '/attendance/today',
                    {},
                    activeToken
                ),
            ])

            setUser(me)
            setRecords(mine)
            setToday(attendanceToday)

        } catch {
            localStorage.removeItem(
                'attendance_token'
            )

            setToken('')
            setUser(null)
            setToday(null)
        }
    }


    useEffect(() => {
        if (token) {
            load()
        }
    }, [token])


    const logout = () => {
        localStorage.removeItem(
            'attendance_token'
        )

        setToken('')
        setUser(null)
        setToday(null)
        setRecords([])
        setAdminView(false)
    }


    if (!token || !user || !today) {
        return (
            <LoginPage
                onLogin={(
                    newToken,
                    newUser
                ) => {
                    localStorage.setItem(
                        'attendance_token',
                        newToken
                    )

                    setToken(newToken)
                    setUser(newUser)
                }}
            />
        )
    }


    return (
        <main>
            <AppHeader
                user={user}
                adminView={adminView}
                onToggleAdmin={() =>
                    setAdminView(
                        !adminView
                    )
                }
                onLogout={logout}
            />

            {adminView &&
            user.role === 'admin' ? (
                <AdminDashboardPage
                    token={token}
                />
            ) : (
                <EmployeePage
                    token={token}
                    records={records}
                    today={today}
                    onRecord={record =>
                        setRecords(
                            old => [
                                record,
                                ...old,
                            ]
                        )
                    }
                    onTodayChange={
                        setToday
                    }
                />
            )}
        </main>
    )
}


createRoot(
    document.getElementById('root')!
).render(
    <App />
)