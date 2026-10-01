import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../lib/api'
import type { AdminRecord, AdminVacationRequest } from '../lib/types'
import { RecordList } from '../components/RecordList'

export function AdminDashboardPage({ token }: { token: string }) {
  const [records, setRecords] = useState<AdminRecord[]>([])
  const [qrImage, setQrImage] = useState('')
  const [vacationRequests, setVacationRequests] = useState<AdminVacationRequest[]>([])

  const [vacationFilter, setVacationFilter] = useState<
      'all' | 'pending' | 'approved' | 'rejected'>('all')

  const statusLabels: Record<string, string> = {
    approved: 'Aprobada',
    rejected: 'Rechazada',
    pending: 'Pendiente'
  }

  const load = async () =>
    setRecords(
      await api<AdminRecord[]>(
        '/attendance',
        {},
        token
      )
    )

  const loadVacationRequests = async () => {
    setVacationRequests(
      await api<AdminVacationRequest[]>(
        '/vacations/requests',
        {},
        token
      )
    )
  }

  useEffect(() => {
    load().catch(() => undefined)
    loadVacationRequests().catch(() => undefined)
  }, [])

  const generateStationQr = async () =>
    setQrImage(
      await QRCode.toDataURL(
        `${window.location.origin}/?station=recepcion`,
        {
          width: 240,
          margin: 1,
        }
      )
    )

  const approveVacation = async (id: number) => {
    await api(
      `/vacations/${id}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({
          admin_note: null,
        }),
      },
      token
    )

    await loadVacationRequests()
  }

  const rejectVacation = async (id: number) => {
    await api(
      `/vacations/${id}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({
          admin_note: null,
        }),
      },
      token
    )

    await loadVacationRequests()
  }

  const today = new Date().toDateString()

  const todayRecords = records.filter(
    (r) =>
      new Date(r.recorded_at + 'Z').toDateString() === today
  )

  const entered = new Set(
    todayRecords
      .filter((r) => r.kind === 'entry')
      .map((r) => r.user_email)
  ).size

  const filteredVacationRequests =
    vacationRequests.filter((request) =>{
      if(vacationFilter === 'all') {
        return true
      }

      return request.status === vacationFilter
    })

  return (
    <section>

      {/* DASHBOARD */}
      <div className="section-title">

        <h2>
          Dashboard de hoy
        </h2>

        <button
          onClick={load}
          className="secondary compact"
        >
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


      {/* QR DE RECEPCIÓN */}
      <section className="qr-panel">

        <div>

          <p className="eyebrow">
            QR FIJO DE RECEPCIÓN
          </p>

          <h2>
            Asistencia diaria
          </h2>

          <p className="muted">
            Imprime este QR y colócalo en recepción.
            No caduca: abre la estación de asistencia
            y el sistema valida sesión y GPS.
          </p>

          <button onClick={generateStationQr}>
            Mostrar QR para imprimir
          </button>

        </div>

        {qrImage && (
          <img
            src={qrImage}
            alt="QR fijo de recepción"
          />
        )}

      </section>


      {/* REGISTRO GENERAL */}
      <div className="section-title">

        <h2>
          Registro general
        </h2>

        <span>
          {records.length} registros
        </span>

      </div>

      <RecordList
        records={records}
        admin
      />


      {/* VACACIONES */}
      <section className="vacation-panel">

        <div className="section-title">

          <div>
            <p className="eyebrow">
              SOLICITUDES
            </p>

            <h2>
              Vacaciones
            </h2>
          </div>

          <span>
            Solicitudes: {filteredVacationRequests.length}
          </span>

          <div className="vacation-filters">

            <button
              type="button"
              className={
                vacationFilter === 'all'
                  ? ''
                  : 'secondary'
              }
              onClick={() => setVacationFilter('all')}
            >
              Todas ({vacationRequests.length})
            </button>

            <button
              type="button"
              className={
                vacationFilter === 'pending'
                  ? ''
                  : 'secondary'
              }
              onClick={() => setVacationFilter('pending')}
            >
              Pendientes
            </button>

            <button
              type="button"
              className={
                vacationFilter === 'approved'
                  ? ''
                  : 'secondary'
              }
              onClick={() => setVacationFilter('approved')}
            >
              Aprobadas
            </button>

            <button
              type="button"
              className={
                vacationFilter === 'rejected'
                  ? ''
                  : 'secondary'
              }
              onClick={() => setVacationFilter('rejected')}
            >
              Rechazadas
            </button>

          </div>

        </div>


        {filteredVacationRequests.length === 0 ? (

          <div className="vacation-empty">
            <p>
              No hay solicitudes de vacaciones.
            </p>
          </div>

        ) : (

          <div className="vacation-list">

            {filteredVacationRequests.map((request) => (

              <article
                key={request.id}
                className="vacation-card"
              >

                <div className="vacation-card-header">

                  <div>

                    <h3>
                      {request.user_name}
                    </h3>

                    <p className="muted">
                      {request.user_email}
                    </p>

                  </div>

                </div>


                <div className="vacation-dates">

                  <strong>
                    {request.start_date}
                  </strong>

                  <span>
                    →
                  </span>

                  <strong>
                    {request.end_date}
                  </strong>

                </div>


                <p className="vacation-reason">
                  <strong>
                    Motivo:
                  </strong>{' '}

                  {request.reason || 'Sin motivo especificado'}
                </p>

                <p className="vacation-reason">
                  <strong>
                    Estado:
                  </strong>{' '}

                  {request.status ? (statusLabels[request.status.toLowerCase()] || request.status) : 'No tiene estado asignado'}
                </p>

                {request.status === 'pending' && (
                  <div className="vacation-actions">

                    <button
                      type="button"
                      onClick={() =>
                        approveVacation(request.id)
                      }
                    >
                      Aprobar
                    </button>

                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        rejectVacation(request.id)
                      }
                    >
                      Rechazar
                    </button>

                  </div>
                )}

              </article>

            ))}

          </div>

        )}

      </section>

    </section>
  )
} 