export interface ScaledDimensions {
  width: number
  height: number
}

const MAX_EDGE = 1024
const JPEG_QUALITY = 0.8
const MAX_DATA_URL_BYTES = 4 * 1024 * 1024

export function computeScaledDimensions(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE
): ScaledDimensions {
  if (width <= maxEdge && height <= maxEdge) return { width, height }
  const scale = maxEdge / Math.max(width, height)
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Math.ceil((base64.length * 3) / 4)
}

export async function compressImageToDataUrl(file: File): Promise<{ dataUrl: string; mediaType: string }> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = objectUrl
    })

    const { width, height } = computeScaledDimensions(image.naturalWidth, image.naturalHeight)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    ctx.drawImage(image, 0, 0, width, height)

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    if (estimateDataUrlBytes(dataUrl) > MAX_DATA_URL_BYTES) {
      throw new Error('Image is too large even after compression')
    }

    return { dataUrl, mediaType: 'image/jpeg' }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
