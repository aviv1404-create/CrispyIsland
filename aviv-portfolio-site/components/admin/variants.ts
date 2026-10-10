'use client'

/**
 * The "file update": smaller copies of a photo, made in the browser.
 *
 * The full-size original is always kept (item.src). Next to it:
 *   web   — long side WEB_PX, for when the photo is opened
 *   thumb — long side THUMB_PX, for folders, the cover flow and icons
 *   px    — an 8-pixel picture stored right in the content list, drawn big
 *           and blocky while the real photo loads (no download at all)
 *
 * Done on the admin's device, so it costs nothing on Vercel beyond storing
 * the two small files.
 */
export const WEB_PX = 2000
export const THUMB_PX = 720
const PX_PX = 8
const QUALITY = 0.82

export interface Variants {
  /** unset when the original is already small enough to show as-is */
  web?: Blob
  thumb?: Blob
  px: string
  type: string
  width: number
  height: number
}

let webpOk: boolean | null = null
/** Safari can't write WebP from a canvas — fall back to JPEG there. */
function canWebp(): boolean {
  if (webpOk === null) {
    try {
      const c = document.createElement('canvas')
      c.width = c.height = 1
      webpOk = c.toDataURL('image/webp').startsWith('data:image/webp')
    } catch {
      webpOk = false
    }
  }
  return webpOk
}

function scaled(bitmap: ImageBitmap, longSide: number): HTMLCanvasElement {
  const k = Math.min(1, longSide / Math.max(bitmap.width, bitmap.height))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(bitmap.width * k))
  c.height = Math.max(1, Math.round(bitmap.height * k))
  const g = c.getContext('2d')!
  g.imageSmoothingQuality = 'high'
  g.drawImage(bitmap, 0, 0, c.width, c.height)
  return c
}

const toBlob = (c: HTMLCanvasElement, type: string) =>
  new Promise<Blob>((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error("Couldn't shrink this photo"))), type, QUALITY))

/** "w,h,RGBRGB…" — each pixel as three 4-bit hex digits (about 150 characters). */
function pixelCode(bitmap: ImageBitmap): string {
  const c = scaled(bitmap, PX_PX)
  const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  let hex = ''
  for (let i = 0; i < data.length; i += 4) {
    hex += (data[i] >> 4).toString(16) + (data[i + 1] >> 4).toString(16) + (data[i + 2] >> 4).toString(16)
  }
  return `${c.width},${c.height},${hex}`
}

/** Make the copies of one photo. GIFs are skipped (a still copy would lose the animation). */
export async function makeVariants(file: Blob): Promise<Variants | null> {
  if (/gif/i.test(file.type)) return null
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }
  try {
    const type = canWebp() ? 'image/webp' : 'image/jpeg'
    const long = Math.max(bitmap.width, bitmap.height)
    const web = long > WEB_PX * 1.15 || file.size > 900 * 1024 ? await toBlob(scaled(bitmap, WEB_PX), type) : undefined
    const thumb = long > THUMB_PX * 1.15 || file.size > 150 * 1024 ? await toBlob(scaled(bitmap, THUMB_PX), type) : undefined
    return {
      // never keep a "copy" that came out bigger than the original
      web: web && web.size < file.size ? web : undefined,
      thumb: thumb && thumb.size < file.size ? thumb : undefined,
      px: pixelCode(bitmap),
      type,
      width: bitmap.width,
      height: bitmap.height,
    }
  } finally {
    bitmap.close()
  }
}
