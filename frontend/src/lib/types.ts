export type User = {
    id: number
    email: string
    full_name: string
    role: string
    is_active: boolean
    hire_date: string | null
    avatar: string | null
}

export type AttendanceRecord = {
    id: number
    kind: 'entry' | 'exit'
    work_date: string
    recorded_at: string
    distance_meters: number
    accuracy_meters: number
    source: 'employee' | 'admin'
    status: 'normal' | 'late' | 'early'
    note: string | null
    location_mode: 'office' | 'remote'
}

export type AdminRecord = AttendanceRecord & {
    user_id: number
    user_name: string
    user_email: string
}

export type AttendanceToday = {
    work_date: string
    entry: AttendanceRecord | null
    exit: AttendanceRecord | null
    is_on_vacation: boolean
    work_mode: WorkMode
    schedule_type: 'fixed' | 'flexible'
    is_office_day: boolean
    requires_location: boolean
    start_time: string | null
    end_time: string | null
    breaks: { started_at: string; ended_at: string | null }[]
    on_break: boolean
    worked_minutes: number
    expected_minutes: number
    week_worked_minutes: number
    week_target_minutes: number
    breaks_allowed: boolean
}

export type VacationRequest = {
    id: number
    user_id: number
    start_date: string
    end_date: string
    status: 'pending' | 'approved' | 'rejected' | 'cancelled'
    request_type: 'employee' | 'admin'
    reason: string | null
    admin_note: string | null
    reviewed_by_id: number | null
    reviewed_at: string | null
    created_at: string
    updated_at: string
    days: number
    reviewed_by_name: string | null
    
}

export type VacationBalance = {
    year: number
    total_days: number
    used_days: number
    pending_days: number
    available_days: number
}

export type AdminVacationRequest = VacationRequest & {
    user_name: string
    user_email: string
}

export type PermissionRequest = {
    id: number
    user_id: number
    kind: 'paid' | 'unpaid'
    start_date: string
    end_date: string
    reason: string
    status: 'pending' | 'approved' | 'rejected' | 'cancelled'
    admin_note: string | null
    reviewed_by_name: string | null
    reviewed_at: string | null
    created_at: string
}

export type Profile = {
    full_name: string
    email: string
    phone: string | null
}

export type NotificationSettings = {
    notify_attendance: boolean
    notify_vacations: boolean
    notify_permissions: boolean
    notify_company: boolean
    notify_weekly: boolean
}

export type TodayEntry = {
    user: User
    entry_at: string
    exit_at: string | null
    status: 'normal' | 'late'
    remote: boolean
}

export type TodayAbsence = {
    user: User
    start_date: string
    end_date: string
    kind: 'paid' | 'unpaid' | null
}

export type TodayOverview = {
    work_date: string
    is_workday: boolean
    pending_count: number
    registered: TodayEntry[]
    missing: User[]
    on_vacation: TodayAbsence[]
    on_permission: TodayAbsence[]
    holiday_name: string | null
}

export type Page =
    | 'dashboard'
    | 'attendance'
    | 'vacations'
    | 'history'
    | 'settings'
    | 'users'
    | 'admin-home'
    | 'admin-requests'
    | 'admin-attendance'
    | 'admin-spaces'
    | 'spaces'
    | 'admin-holidays'
    | 'team'
    | 'admin-reports'
    | 'news'
    | 'calendar'

export type Branding = {
    company_name: string
    logo: string | null
    primary_color: string
    sidebar_color: string
}

export type MissingToday = {
    work_date: string
    is_workday: boolean
    late_limit: string
    limit_passed: boolean
    missing: User[]
    on_vacation: User[]
    on_permission: User[]
}

export type AppNotification = {
    id: number
    kind: string
    title: string
    body: string
    page: Page
    created_at: string
    read_at: string | null
}

export type Space = {
    id: number
    name: string
    kind: string
    capacity: number
    location: string | null
    description: string | null
    equipment: string[]
    open_time: string
    close_time: string
    open_days: number[]
    is_active: boolean
}

export type Booking = {
    id: number
    space_id: number
    space_name: string
    user_id: number
    user_name: string
    title: string
    notes: string | null
    booking_date: string
    start_time: string
    end_time: string
    status: 'confirmed' | 'cancelled'
}

export type NotificationsData = { items: AppNotification[]; unread: number }

export type UserCreated = User & { temporary_password: string }

export type Holiday = { id: number; holiday_date: string; name: string }

export type Schedule = {
    start_time: string
    end_time: string
    tolerance_minutes: number
    work_days: number[]
    is_custom: boolean
    work_mode: WorkMode
    schedule_type: 'fixed' | 'flexible'
    weekly_minutes: number
    daily_minutes: number
    office_days: number[]
}

export type Person = {
    id: number
    full_name: string
    email: string
    role: string
    avatar: string | null
    is_active: boolean
    hire_date: string | null
    employee_code: string | null
    position: string | null
    department: string | null
    manager_id: number | null
    phone: string | null
    schedule: Schedule
    is_top_level: boolean
}

export type ImportRow = {
    row: number
    email: string
    full_name: string
    action: 'create' | 'update' | 'error'
    errors: string[]
}

export type ImportResult = {
    dry_run: boolean
    rows: ImportRow[]
    created: number
    updated: number
    failed: number
    credentials: { full_name: string; email: string; temporary_password: string }[]
}

export type IncidenceCode = {
    key: string
    code: string
    label: string
    include_in_incidences: boolean
    color: string
}

export type ReportPerson = {
    user_id: number
    employee_code: string | null
    full_name: string
    department: string | null
    position: string | null
    workdays: number
    counts: Record<string, number>
    hours: number
    late_minutes: number
}

export type ReportPreview = {
    start: string
    end: string
    codes: IncidenceCode[]
    people: ReportPerson[]
    totals: Record<string, number>
    hours: number
    late_minutes: number
}

export type PostAuthor = { id: number; full_name: string; avatar: string | null; position: string | null }

export type Post = {
    id: number
    kind: 'announcement' | 'meeting'
    title: string
    body: string
    image: string | null
    pinned: boolean
    audience: string
    audience_label: string
    created_at: string
    updated_at: string
    author: PostAuthor
    meeting_date: string | null
    start_time: string | null
    end_time: string | null
    location: string | null
    meeting_url: string | null
    space_id: number | null
    space_name: string | null
    counts: Record<string, number>
    my_response: string | null
    booking_id: number | null
    audience_size: number
    can_manage: boolean
}

export type PostsMeta = {
    can_publish: boolean
    can_target_all: boolean
    departments: string[]
    has_team: boolean
    is_admin: boolean
}

export type ResponsePerson = {
    user_id: number
    full_name: string
    avatar: string | null
    position: string | null
    response: string | null
    comment: string | null
}

export type CalendarEvent = {
    id: string
    type: 'holiday' | 'vacation' | 'permission' | 'meeting' | 'booking' | 'team_absence' | 'office'
    title: string
    subtitle: string | null
    start_date: string
    end_date: string
    start_time: string | null
    end_time: string | null
    page: Page
    pending: boolean
}

export type WorkMode = 'onsite' | 'hybrid' | 'remote'

export const MODE_LABEL: Record<WorkMode, string> = {
    onsite: 'Presencial',
    hybrid: 'Híbrido',
    remote: 'Remoto',
}

export type OfficeDay = {
    day: string
    office: boolean
    base_office: boolean
    change: 'add' | 'remove' | null
    reason: string | null
    is_workday: boolean
    holiday: string | null
}