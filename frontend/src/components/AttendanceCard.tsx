import type {
    AttendanceRecord,
    AttendanceToday,
} from '../lib/types'
import { Icon } from './Icon'

export function AttendanceCard({
    today,
    working,
    onRegisterEntry,
    onRegisterExit,
    isStation,
}: {
    today: AttendanceToday
    working: boolean
    onRegisterEntry: () => void
    onRegisterExit: () => void
    isStation: boolean
}) {
    const hasEntry = today.entry !== null
    const hasExit = today.exit !== null

    if (today.is_on_vacation) {
        return (
            <article className="dashboard-card attendance-card">

                <div className="dashboard-card-title">
                    <div>
                        <p className="eyebrow">
                            ASISTENCIA
                        </p>

                        <h2>
                            Registro de Hoy
                        </h2>
                    </div>

                    <Icon name="clock" />
                </div>

                <div className="attendance-vacation">
                    <Icon name="sun" size={14} />
                    <p>
                        Tienes vacaciones aprobadas
                        para hoy.
                    </p>
                </div>

            </article>
        )
    }

    return (
        <article className="dashboard-card attendance-card">

            <div className="dashboard-card-title">

                <div>
                    <p className="eyebrow">
                        ASISTENCIA
                    </p>

                    <h2>
                        Registro de Hoy
                    </h2>
                </div>

                <Icon name="clock" />

            </div>


            <div className="attendance-status">

                <div className="attendance-action">

                    <Icon name={hasEntry ? 'check' : 'clock'} size={16} />

                    <div>
                        <strong>
                            {hasEntry
                                ? 'Entrada registrada'
                                : 'Registrar entrada'}
                        </strong>

                        <span>
                            {hasEntry
                                ? new Date(
                                      today.entry!.recorded_at
                                  ).toLocaleTimeString(
                                      'es-MX',
                                      {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                      }
                                  )
                                : 'Aún no registrada'}
                        </span>
                    </div>

                    {!hasEntry &&  (
                        <button
                            type="button"
                            className="compact"
                            disabled={working}
                            onClick={onRegisterEntry}
                        >
                            {working
                                ? '...'
                                : 'Registrar'}
                        </button>
                    )}

                </div>


                <div className="attendance-action">

                    <Icon name={hasExit ? 'check' : 'clock'} size={16} />

                    <div>
                        <strong>
                            {hasExit
                                ? 'Salida registrada'
                                : hasEntry
                                  ? 'Registrar salida'
                                  : 'Salida bloqueada'}
                        </strong>

                        <span>
                            {hasExit
                                ? new Date(
                                      today.exit!.recorded_at
                                  ).toLocaleTimeString(
                                      'es-MX',
                                      {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                      }
                                  )
                                : hasEntry
                                  ? 'Jornada en curso'
                                  : 'Primero registra tu entrada'}
                        </span>
                    </div>

                    {!hasExit &&
                        hasEntry &&
                        (
                            <button
                                type="button"
                                className="secondary compact"
                                disabled={working}
                                onClick={onRegisterExit}
                            >
                                {working
                                    ? '...'
                                    : 'Registrar'}
                            </button>
                        )}

                </div>

            </div>


            <div className="attendance-footer">

                <Icon name="pin" size={13} />

                <span>
                    {isStation
                        ? "Registro por QR de recepcion"
                        : hasEntry || hasExit
                            ? 'Ubicación verificada'
                            : 'Ubicación requerida para registrar'}
                </span>

            </div>

        </article>
    )
}