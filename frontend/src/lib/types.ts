export type User = { id: number; email: string; full_name: string; role: string }
export type AttendanceRecord = { id: number; kind: string; recorded_at: string; distance_meters: number; accuracy_meters: number }
export type AdminRecord = AttendanceRecord & { user_name: string; user_email: string }
