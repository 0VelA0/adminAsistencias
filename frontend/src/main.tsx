import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrandingProvider } from './lib/branding'

import { api } from './lib/api'

import type {
    AttendanceRecord,
    AttendanceToday,
    User,
    VacationRequest,
    PermissionRequest,
    Page
} from './lib/types'

import { AppHeader } from './components/AppHeader'
import { LoginPage } from './pages/LoginPage'
import { EmployeePage } from './pages/EmployeePage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AppSidebar } from './components/AppSidebar'
import { VacationsPage } from './pages/VacationsPage'
import { AttendancePage } from './pages/AttendancePage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { UsersPage } from './pages/UsersPage'

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

    const [activePage, setActivePage] = useState<Page>('dashboard')

    const [vacationRequests, setVacationRequests] =
        useState<VacationRequest[]>([])
    
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

    const ADMIN_SECTIONS = {
        'admin-home': 'home',
        'admin-requests': 'requests',
        'admin-attendance': 'attendance',
    } as const

    // dentro de App():
    const adminSection =
        ADMIN_SECTIONS[activePage as keyof typeof ADMIN_SECTIONS]

    const toggleAdmin = () => {
        const next = !adminView
        setAdminView(next)
        setActivePage(next ? 'admin-home' : 'dashboard')
    }

    const [permissionRequests, setPermissionRequests] =
    useState<PermissionRequest[]>([])

    const loadPermissionRequests = async () => {
        const data = await api<PermissionRequest[]>('/permissions/mine', {}, token)
        setPermissionRequests(data)
    }

    useEffect(() => {
        if (token) {
            load()
            loadVacationRequests().catch(() => undefined)
            loadPermissionRequests().catch(() => undefined)
        }
    }, [token])

    const loadVacationRequests = async () => {
        const data = await api<VacationRequest[]>(
            '/vacations/mine',
            {},
            token
    )

    setVacationRequests(data)
}


    useEffect(() => {
        if (token) {
            load()
            loadVacationRequests().catch(() => undefined)
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
        <div className="app-layout">
            tsx
            <AppSidebar
                user={user}
                activePage={activePage}
                adminView={adminView}
                onPageChange={setActivePage}
                onToggleAdmin={toggleAdmin}
                onLogout={logout}
            />

            <main className="app-main">

                <AppHeader
                    user={user}
                    adminView={adminView}
                    onToggleAdmin={toggleAdmin}
                    onProfileClick={() => setActivePage('settings')}
                    onLogout={logout}
                />
                {adminView &&
                user.role === 'admin' ? (
                        <>
                            {adminSection && (
                                <AdminDashboardPage
                                    token={token}
                                    section={adminSection}
                                    onNavigate={setActivePage}
                                />
                            )}

                            {activePage === 'users' && (
                                <UsersPage token={token} currentUser={user} />
                            )}

                            {activePage === 'settings' && (
                                <SettingsPage token={token} user={user} onUserChange={setUser} />
                            )}
                        </>
                ) : (
                    <>
                        {activePage === 'dashboard' &&(
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
                                onNavigate={setActivePage}
                                vacationRequests={vacationRequests}
                                onRequestsChange={loadVacationRequests}
                            />       
                        )}

                        {activePage === 'vacations' && (
                            <VacationsPage
                                token={token}
                                requests={vacationRequests}
                                onRequestsChange={loadVacationRequests}/>

                        )}
                        {activePage === 'attendance' &&(
                            <AttendancePage
                                token={token}
                                records={records}
                                today={today}
                                onRecord={record => setRecords(old => [record, ...old])}
                                onTodayChange={setToday}
                                vacationRequests={vacationRequests}
                                permissionRequests={permissionRequests}
                                onPermissionsChange={loadPermissionRequests}
                            /> 
                        )}
                        {activePage === 'history' && (
                            <HistoryPage
                                records={records}
                                vacationRequests={vacationRequests}
                                permissionRequests={permissionRequests}
                            />
                        )}
                        {activePage === 'settings' &&(
                            <SettingsPage 
                                token={token} 
                                user={user} 
                                onUserChange={setUser} 
                            />
                        )}
                        {activePage === 'users' && user.role === 'admin' && (
                            <UsersPage token={token} currentUser={user} />
                        )}
                            
                    </>

                )}
            </main>
        </div>

    )
}


createRoot(
    document.getElementById('root')!
).render(
    <BrandingProvider>
        <App />
    </BrandingProvider>

)