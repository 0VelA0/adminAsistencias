export type User = {
    id: number
    email: string
    full_name: string
    role: string
    is_active: boolean
}

export type AttendanceRecord = {
    id: number
    kind: 'entry' | 'exit'
    work_date: string
    recorded_at: string
    distance_meters: number
    accuracy_meters: number
    source: 'employee' | 'admin'
    status: 'normal' | 'late'
    note: string | null
}

export type AdminRecord = AttendanceRecord & {
    user_name: string
    user_email: string
}

export type AttendanceToday = {
    work_date: string
    entry: AttendanceRecord | null
    exit: AttendanceRecord | null
    is_on_vacation: boolean
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