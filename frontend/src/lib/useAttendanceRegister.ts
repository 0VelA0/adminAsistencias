import { useState } from 'react'
import { api } from './api'
import { getLocation } from './location'
import type { AttendanceRecord, AttendanceToday } from './types'

export function useAttendanceRegister({
    token,
    today,
    onRecord,
    onTodayChange,
}: {
    token: string
    today: AttendanceToday
    onRecord: (record: AttendanceRecord) => void
    onTodayChange: (today: AttendanceToday) => void
}) {
    const [message, setMessage] = useState('')
    const [working, setWorking] = useState(false)

    const register = async (path: string) => {
        setWorking(true)
        setMessage('Validando ubicación…')

        try {
            const location = await getLocation()

            const record = await api<AttendanceRecord>(
                path,
                { method: 'POST', body: JSON.stringify(location) },
                token
            )

            onRecord(record)
            onTodayChange({
                ...today,
                entry: record.kind === 'entry' ? record : today.entry,
                exit: record.kind === 'exit' ? record : today.exit,
            })

            setMessage(
                `${record.kind === 'entry' ? 'Entrada' : 'Salida'} registrada correctamente${
                    record.status === 'late' ? ' — marcada como retraso.' : '.'
                }`
            )

            if (new URLSearchParams(window.location.search).get('station')) {
                window.history.replaceState({}, '', window.location.pathname)
            }
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : 'No se pudo registrar'
            )
        } finally {
            setWorking(false)
        }
    }

    return { message, working, register }
}