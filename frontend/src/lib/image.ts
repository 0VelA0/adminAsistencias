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

export async function fileToLogo(file: File, maxSize = 320): Promise<string> {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        throw new Error('Usa una imagen PNG, JPG o WebP.')
    }

    const url = URL.createObjectURL(file)

    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image()
            image.onload = () => resolve(image)
            image.onerror = () => reject(new Error('No se pudo leer la imagen.'))
            image.src = url
        })

        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)

        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Tu navegador no pudo procesar la imagen.')

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        let result = canvas.toDataURL('image/png')
        if (result.length > 390_000) result = canvas.toDataURL('image/webp', 0.9)

        if (result.length > 390_000) {
            throw new Error('La imagen es demasiado pesada. Usa una más simple.')
        }

        return result
    } finally {
        URL.revokeObjectURL(url)
    }
}