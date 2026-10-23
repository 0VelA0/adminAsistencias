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

    const run = async (label: string, action: () => Promise<void>) => {
        setWorking(true)
        setMessage(label)

        try {
            await action()
            onTodayChange(await api<AttendanceToday>('/attendance/today', {}, token))
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'No se pudo completar la acción.')
        } finally {
            setWorking(false)
        }
    }

    const register = (path: string, extra: Record<string, string> = {}) =>
        run(today.requires_location ? 'Validando ubicación…' : 'Registrando…', async () => {
            const location = today.requires_location ? await getLocation() : {}

            const record = await api<AttendanceRecord>(
                path,
                { method: 'POST', body: JSON.stringify({ ...location, ...extra }) },
                token
            )

            onRecord(record)

            setMessage(
                `${record.kind === 'entry' ? 'Jornada iniciada' : 'Jornada terminada'}` +
                    `${record.location_mode === 'remote' ? ' (remoto)' : ''}` +
                    `${record.status === 'late' ? ' — marcada como retardo.' : '.'}`
            )

            if (new URLSearchParams(window.location.search).get('station')) {
                window.history.replaceState({}, '', window.location.pathname)
            }
        })

    const startBreak = () =>
        run('Iniciando pausa…', async () => {
            await api('/attendance/break/start', { method: 'POST' }, token)
            setMessage('Pausa iniciada: este tiempo no cuenta en tu jornada.')
        })

    const endBreak = () =>
        run('Reanudando…', async () => {
            await api('/attendance/break/end', { method: 'POST' }, token)
            setMessage('Jornada reanudada.')
        })

    return { message, working, register, startBreak, endBreak }
}