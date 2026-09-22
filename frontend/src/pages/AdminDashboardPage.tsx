import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../lib/api'
import type { AdminRecord } from '../lib/types'
import { RecordList } from '../components/RecordList'

export function AdminDashboardPage({ token }: { token: string }) {
  const [records, setRecords] = useState<AdminRecord[]>([]), [qrImage, setQrImage] = useState('')
  const load = async () => setRecords(await api<AdminRecord[]>('/attendance', {}, token))
  useEffect(() => { load().catch(() => undefined) }, [])
  const generateStationQr = async () => setQrImage(await QRCode.toDataURL(`${window.location.origin}/?station=recepcion`, { width: 240, margin: 1 }))
  const today = new Date().toDateString(), todayRecords = records.filter(r => new Date(r.recorded_at + 'Z').toDateString() === today), entered = new Set(todayRecords.filter(r => r.kind === 'entry').map(r => r.user_email)).size
  return <section>
    <div className="section-title">

      <h2>
        Dashboard de hoy
      </h2>

      <button onClick={load} className="secondary compact">
        Actualizar
      </button>

    </div>

    <div className="stats">

      <article>

        <strong>
          {entered}
        </strong>

        <span>
          registraron entrada
        </span>

      </article>
      <article>

        <strong>
          {todayRecords.length}
        </strong>

        <span>
          movimientos hoy
        </span>

      </article>
    </div>
    <section className="qr-panel">

      <div>

        <p className="eyebrow">
          QR FIJO DE RECEPCIÓN
        </p>

        <h2>
          Asistencia diaria
        </h2>

        <p className="muted">
          Imprime este QR y colócalo en recepción. No caduca: abre la estación de asistencia y el sistema valida sesión y GPS.
        </p>

        <button onClick={generateStationQr}>
          Mostrar QR para imprimir
        </button>

      </div>

      {qrImage && <img src={qrImage} alt="QR fijo de recepción" />}

    </section>

    <div className="section-title">

      <h2>
        Registro general
      </h2>

      <span>
        {records.length} registros
      </span>

    </div>

    <RecordList records={records} admin />
    
  </section>
}
