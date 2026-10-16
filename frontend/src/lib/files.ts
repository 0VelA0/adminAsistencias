function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = Object.assign(document.createElement('a'), { href: url, download: filename })

    document.body.appendChild(link)
    link.click()
    link.remove()

    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadBase64(filename: string, base64: string, mime: string) {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    triggerDownload(new Blob([bytes], { type: mime }), filename)
}

export function downloadCsv(filename: string, rows: string[][]) {
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\r\n')
    triggerDownload(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), filename) // BOM para acentos en Excel
}

export const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
        reader.readAsDataURL(file)
    })