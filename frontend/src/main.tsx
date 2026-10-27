import { useEffect, useState, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { BrandingProvider } from './lib/branding'

import { api } from './lib/api'

import type {
    AttendanceRecord,
    AttendanceToday,
    User,
    VacationRequest,
    PermissionRequest,
    Page,
    Holiday,
    Schedule
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
import {ToastProvider} from './components/Toast'
import { FullScreenStatus } from './components/StatusBlocks'
import { useOnline } from './lib/useOnline'
import './styles.css'
import { SpacesAdminPage } from './pages/SpacesAdminPage'
import { SpacesPage } from './pages/SpacesPage'
import { HolidaysPage } from './pages/HolidaysPage'
import { TeamPage } from './pages/TeamPage'
import { ReportsPage } from './pages/ReportsPage'
import { NewsPage } from './pages/NewsPage'
import { CalendarPage } from './pages/CalendarPage'
import { clearToken, isRemembered, readToken, saveToken } from './lib/session'
import { useIdleTimeout } from './lib/useIdleTimeout'


function App() {

    const IDLE_LIMIT = 30 * 60_000 // 30 minutos sin actividad
    
    const IDLE_WARNING = 60_000    // aviso 1 minuto antes

    const [token, setToken] = useState(
        localStorage.getItem(
            'attendance_token'
        ) || ''
    )

    const [schedule, setSchedule] = useState<Schedule | null>(null)

    useEffect(() => {
        if (token) api<Schedule>('/schedule/mine', {}, token).then(setSchedule).catch(() => undefined)
    }, [token])

    const workDays = schedule?.work_days ?? [0, 1, 2, 3, 4]

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
        setLoadError('')

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

        } catch (error) {
            const message = error instanceof Error ? error.message : ''

                if (/token|desactivado/i.test(message)) {
                    clearToken()
                    setToken('')
                    setUser(null)
                    setToday(null)
                } else {
                    setLoadError(message || 'No se pudo conectar con el servidor.')
                }
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

    const [loadError, setLoadError] = useState('')
    const online = useOnline()

    const [remembered, setRemembered] = useState(isRemembered)
    const [loginNotice, setLoginNotice] = useState('')

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

    useEffect(() => {
        if (!loadError) return

        const id = setTimeout(() => load(), 5000)
        return () => clearTimeout(id)

    }, [loadError])


    const logout = () => {
        clearToken()
        setToken('')
        setUser(null)
        setToday(null)
        setRecords([])
        setAdminView(false)
    }

    const { secondsLeft, stayActive } = useIdleTimeout({
        enabled: Boolean(token && user) && !remembered,
        timeoutMs: IDLE_LIMIT,
        warningMs: IDLE_WARNING,
        onTimeout: () => {
            logout()
            setLoginNotice('Tu sesión se cerró por inactividad. Vuelve a iniciar sesión.')
        },
    })

    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === '1')

    const toggleCollapsed = () =>
        setCollapsed(current => {
            const next = !current

            try {
                localStorage.setItem('sidebar_collapsed', next ? '1' : '0')
            } catch {
                /* sin almacenamiento, solo no se recuerda */
            }

            return next
        })

    const goTo = (page: Page) => {
        const adminPage = page.startsWith('admin-') || page === 'users'

        if (adminPage) setAdminView(true)
        else if (page !== 'settings') setAdminView(false)

        setActivePage(page)
    }

    const [holidays, setHolidays] = useState<Holiday[]>([])

    const loadHolidays = () =>
        api<Holiday[]>('/holidays', {}, token).then(setHolidays).catch(() => undefined)

    useEffect(() => {
        if (token) loadHolidays()
    }, [token])

    const holidayDates = useMemo(
        () => new Set(holidays.map(h => h.holiday_date.slice(0, 10))),
        [holidays]
    )


    if (!token) {
        return (
            <LoginPage
                onLogin={(newToken, newUser, remember) => {
                    saveToken(newToken, remember)
                    setRemembered(remember)
                    setLoginNotice('')
                    setToken(newToken)
                    setUser(newUser)
                }}
            />
        )
    }

    if (!user || !today) {
        return <FullScreenStatus error={loadError} onRetry={() => load()} />
    }


    return (
        <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>

            {!online && (
                <div className="offline-banner" role="status">
                    Sin conexión a internet. Algunas funciones no estarán disponibles.
                </div>
            )}

            <AppSidebar
                user={user}
                activePage={activePage}
                adminView={adminView}
                onPageChange={setActivePage}
                onToggleAdmin={toggleAdmin}
                onLogout={logout}
                collapsed={collapsed}
                onToggleCollapsed={toggleCollapsed}
            />

            <main className="app-main">

                <AppHeader
                    user={user}
                    adminView={adminView}
                    onToggleAdmin={toggleAdmin}
                    onProfileClick={() => setActivePage('settings')}
                    onLogout={logout}
                    token={token}
                    onNavigate={goTo}
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
                             
                            {activePage === 'admin-spaces' && <SpacesAdminPage token={token} user={user} />}

                            {activePage === 'admin-holidays' && <HolidaysPage token={token} onChanged={loadHolidays} />}

                            {activePage === 'team' && <TeamPage token={token} user={user} />}

                            {activePage === 'admin-reports' && <ReportsPage token={token} />}

                            {activePage === 'news' && <NewsPage token={token} />}

                            {activePage === 'calendar' && <CalendarPage token={token} user={user} onNavigate={goTo} />}
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
                                permissionRequests={permissionRequests}
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
                                holidays={holidayDates}
                                workDays={workDays}
                            /> 
                        )}
                        {activePage === 'history' && (
                            <HistoryPage
                                records={records}
                                vacationRequests={vacationRequests}
                                permissionRequests={permissionRequests}
                                holidays={holidayDates}
                                workDays={workDays}
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
                       
                        {activePage === 'spaces' && <SpacesPage token={token} user={user} />}

                        {activePage === 'team' && <TeamPage token={token} user={user} />}

                        {activePage === 'news' && <NewsPage token={token} />}
                        
                        {activePage === 'calendar' && <CalendarPage token={token} user={user} onNavigate={goTo} />}
                            
                    </>

                )}
            </main>

            {secondsLeft !== null && (
                <div className="modal-backdrop">
                    <div className="modal session-modal" role="alertdialog" aria-live="assertive">
                        <div className="session-count">{secondsLeft}</div>
                        <h2>¿Sigues ahí?</h2>
                        <p className="muted">
                            Por seguridad, tu sesión se cerrará en {secondsLeft} segundos por inactividad.
                        </p>

                        <div className="modal-actions">
                            <button type="button" className="secondary" onClick={logout}>
                                Cerrar sesión
                            </button>
                            <button type="button" onClick={stayActive}>
                                Seguir conectado
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

    )
}


createRoot(
    document.getElementById('root')!
).render(
    <BrandingProvider>
        <ToastProvider>
            <App />
        </ToastProvider>
    </BrandingProvider>

)