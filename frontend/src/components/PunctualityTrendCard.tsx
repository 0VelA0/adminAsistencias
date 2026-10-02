const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const W = 300
const H = 140
const PAD = { left: 28, right: 10, top: 10, bottom: 22 }

export function PunctualityTrendCard({
    data,
}: {
    data: { month: number; pct: number }[]
}) {
    const lastMonth = Math.max(new Date().getMonth(), 1)
    const min = data.length ? Math.min(...data.map(d => d.pct)) : 0
    const yMin = Math.max(0, Math.floor((min - 5) / 10) * 10)

    const x = (month: number) =>
        PAD.left + (month / lastMonth) * (W - PAD.left - PAD.right)

    const y = (pct: number) =>
        PAD.top + (1 - (pct - yMin) / (100 - yMin)) * (H - PAD.top - PAD.bottom)

    const line = data
        .map((d, i) => `${i ? 'L' : 'M'}${x(d.month)},${y(d.pct)}`)
        .join(' ')

    const area = data.length
        ? `${line} L${x(data[data.length - 1].month)},${H - PAD.bottom} L${x(data[0].month)},${H - PAD.bottom} Z`
        : ''

    const grid: number[] = []
    for (let v = yMin; v <= 100; v += 10) grid.push(v)

    const caption =
        data.length < 2
            ? 'Aún no hay datos suficientes'
            : data[data.length - 1].pct > data[0].pct
              ? 'Puntualidad en aumento'
              : data[data.length - 1].pct < data[0].pct
                ? 'Puntualidad a la baja'
                : 'Puntualidad estable'

    return (
        <article className="dashboard-card">
            <div className="dashboard-card-title">
                <div>
                    <p className="eyebrow">AÑO ACTUAL</p>
                    <h2>Tendencia de puntualidad</h2>
                </div>
                <span className="dashboard-card-icon">↗</span>
            </div>

            <svg
                className="trend-chart"
                viewBox={`0 0 ${W} ${H}`}
                role="img"
                aria-label="Tendencia mensual de puntualidad"
            >
                <defs>
                    <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3fa66b" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#3fa66b" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {grid.map(v => (
                    <g key={v}>
                        <line
                            x1={PAD.left}
                            x2={W - PAD.right}
                            y1={y(v)}
                            y2={y(v)}
                            stroke="#e5eaf3"
                            strokeWidth="1"
                        />
                        <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" fontSize="8" fill="#65718a">
                            {v}
                        </text>
                    </g>
                ))}

                {Array.from({ length: lastMonth + 1 }, (_, m) => (
                    <text
                        key={m}
                        x={x(m)}
                        y={H - 6}
                        textAnchor="middle"
                        fontSize="8"
                        fill="#65718a"
                    >
                        {MONTHS[m]}
                    </text>
                ))}

                {area && <path d={area} fill="url(#trend-fill)" />}

                {line && (
                    <path
                        d={line}
                        fill="none"
                        stroke="#3fa66b"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                )}

                {data.map(d => (
                    <circle
                        key={d.month}
                        cx={x(d.month)}
                        cy={y(d.pct)}
                        r="3"
                        fill="#fff"
                        stroke="#3fa66b"
                        strokeWidth="2"
                    />
                ))}
            </svg>

            <p className="trend-caption">{caption}</p>
        </article>
    )
}