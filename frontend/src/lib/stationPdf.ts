import QRCode from 'qrcode'

type PdfOptions = {
    url: string
    companyName: string
    logoSrc: string
    primaryColor: string
}

const hexToRgb = (hex: string): [number, number, number] => {
    const n = parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

async function loadImage(src: string) {
    const img = new Image()

    await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('No se pudo cargar el logo.'))
        img.src = src
    })

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')!.drawImage(img, 0, 0)

    return {
        dataUrl: canvas.toDataURL('image/png'),
        width: img.naturalWidth,
        height: img.naturalHeight,
    }
}

export async function downloadStationPdf({
    url,
    companyName,
    logoSrc,
    primaryColor,
}: PdfOptions) {
    const { jsPDF } = await import('jspdf')

    const qr = await QRCode.toDataURL(url, {
        width: 1000,
        margin: 1,
        errorCorrectionLevel: 'M',
    })

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const center = pageWidth / 2
    const accent = hexToRgb(primaryColor)

    let y = 28

    try {
        const logo = await loadImage(logoSrc)
        const ratio = Math.min(70 / logo.width, 28 / logo.height)
        const w = logo.width * ratio
        const h = logo.height * ratio

        doc.addImage(logo.dataUrl, 'PNG', center - w / 2, y, w, h)
        y += h + 12
    } catch {
        y += 6 // sin logo, el PDF sale igual
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(24)
    doc.setTextColor(23, 32, 51)
    doc.text(companyName, center, y, { align: 'center', maxWidth: pageWidth - 40 })
    y += 12

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(15)
    doc.setTextColor(...accent)
    doc.text('Registro de asistencia', center, y, { align: 'center' })
    y += 16

    const size = 120
    const x = center - size / 2

    doc.setDrawColor(...accent)
    doc.setLineWidth(1.2)
    doc.roundedRect(x - 6, y - 6, size + 12, size + 12, 4, 4)
    doc.addImage(qr, 'PNG', x, y, size, size)
    y += size + 24

    doc.setFontSize(14)
    doc.setTextColor(23, 32, 51)
    doc.text('Escanea este código con la cámara de tu celular', center, y, { align: 'center' })
    y += 8
    doc.text('e inicia sesión para registrar tu entrada o salida.', center, y, { align: 'center' })
    y += 14

    doc.setFontSize(10)
    doc.setTextColor(101, 113, 138)
    doc.text(
        'Debes estar dentro de las instalaciones y tener la ubicación activada.',
        center,
        y,
        { align: 'center' }
    )

    doc.setFontSize(8)
    doc.text(url, center, 285, { align: 'center' })

    doc.save('QR-asistencia.pdf')
}