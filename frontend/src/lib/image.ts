export async function fileToAvatar(file: File, size = 256): Promise<string> {
    if (!file.type.startsWith('image/')) {
        throw new Error('Selecciona un archivo de imagen.')
    }

    const url = URL.createObjectURL(file)

    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image()
            image.onload = () => resolve(image)
            image.onerror = () => reject(new Error('No se pudo leer la imagen.'))
            image.src = url
        })

        const side = Math.min(img.width, img.height)
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size

        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Tu navegador no pudo procesar la imagen.')

        ctx.fillStyle = '#fff' // PNG con transparencia
        ctx.fillRect(0, 0, size, size)
        ctx.drawImage(
            img,
            (img.width - side) / 2,
            (img.height - side) / 2,
            side,
            side,
            0,
            0,
            size,
            size
        )

        return canvas.toDataURL('image/jpeg', 0.85)
    } finally {
        URL.revokeObjectURL(url)
    }
}