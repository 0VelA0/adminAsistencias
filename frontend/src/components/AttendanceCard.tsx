import type {
    AttendanceRecord,
    AttendanceToday,
} from '../lib/types'

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

                    <span className="dashboard-card-icon">
                        ◷
                    </span>
                </div>

                <div className="attendance-vacation">
                    <strong>
                        🏖️ Día de vacaciones
                    </strong>

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

                <span className="dashboard-card-icon">
                    ◷
                </span>

            </div>


            <div className="attendance-status">

                <div className="attendance-action">

                    <span className="attendance-icon entry">
                        {hasEntry ? '✓' : '◷'}
                    </span>

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

                    <span className="attendance-icon exit">
                        {hasExit ? '✓' : '◷'}
                    </span>

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

                <span>
                    📍
                </span>

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