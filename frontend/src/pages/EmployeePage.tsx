import { useState } from 'react'
import { api } from '../lib/api'
import { getLocation } from '../lib/location'
import type { AttendanceRecord } from '../lib/types'
import { RecordList } from '../components/RecordList'

export function EmployeePage({ token, records, onRecord }: { token: string; records: AttendanceRecord[]; onRecord: (record: AttendanceRecord) => void }) {
  const station = new URLSearchParams(window.location.search).get('station')
  const [message, setMessage] = useState(''), [working, setWorking] = useState(false)
  const register = async (path: string, body: Record<string, string> = {}) => { setWorking(true); setMessage('Validando ubicación…'); try { const location = await getLocation(); const record = await api<AttendanceRecord>(path, { method: 'POST', body: JSON.stringify({ ...location, ...body }) }, token); onRecord(record); setMessage(`${record.kind === 'entry' ? 'Entrada' : 'Salida'} registrada correctamente.`); if (station) window.history.replaceState({}, '', window.location.pathname) } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo registrar') } finally { setWorking(false) } }
  return <>
    <section className="hero">
      <p>
        {station ? 'Estación: recepción' : `Hoy, ${new Intl.DateTimeFormat('es-MX', { dateStyle: 'full' }).format(new Date())}`}
      </p>
      <h2>
        {station ? 'Registrar asistencia' : '¿Qué deseas registrar?'}
      </h2>
      <p className="muted">
        {station ? 'Confirma el registro. La hora la toma el servidor y se valida tu ubicación.' : 'Puedes registrar usando tu ubicación desde la oficina.'}
      </p>
      <div className="actions">
        {station
           ? <button onClick={() => register('/qr-attendance', { station })} disabled={working}>
              {working ? 'Registrando…' : 'Confirmar asistencia'}
            </button> 
            : <>
                <button onClick={() => register('/attendance/entry')} disabled={working}>
                  Registrar entrada
                </button>
                <button className="secondary" onClick={() => register('/attendance/exit')} disabled={working}>
                  Registrar salida
                </button>
              </>}
      </div>
      {message && 
        <p className="notice">
          {message}
        </p>
      }
      
    </section>

    <section>

      <div className="section-title">

        <h2>
          Mi historial
        </h2>

        <span>
          {records.length} registros
        </span>

      </div>

      <RecordList records={records} />

    </section>

  </>
}
