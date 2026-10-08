import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import defaultLogo from '../assets/logo.png'
import { useBranding } from '../lib/branding'
import { downloadStationPdf } from '../lib/stationPdf'
import { useToast } from '../components/Toast'

// Debe coincidir con attendance_station_code del backend
const STATION = 'recepcion'

export function StationQrPanel() {
    const { branding } = useBranding()
    const toast = useToast()

    const url = `${window.location.origin}/?station=${STATION}`

    const [preview, setPreview] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        QRCode.toDataURL(url, { width: 240, margin: 1 })
            .then(setPreview)
            .catch(() => undefined)
    }, [url])

    const download = async () => {
        setBusy(true)

        try {
            await downloadStationPdf({
                url,
                companyName: branding.company_name,
                logoSrc: branding.logo ?? defaultLogo,
                primaryColor: branding.primary_color,
            })

            toast.success('PDF generado. Revisa tus descargas.')
        } catch {
            toast.error('No se pudo generar el PDF.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="qr-panel">
            <div>
                <p className="eyebrow">QR FIJO DE RECEPCIÓN</p>
                <h2>Asistencia diaria</h2>

                <p className="muted">
                    Imprime este QR y colócalo en recepción. No caduca: abre la estación de
                    asistencia y el sistema valida sesión y GPS.
                </p>

                <button type="button" onClick={download} disabled={busy}>
                    {busy ? 'Generando…' : 'Descargar PDF para imprimir'}
                </button>
            </div>

            {preview && <img src={preview} alt="QR fijo de recepción" />}
        </section>
    )
}