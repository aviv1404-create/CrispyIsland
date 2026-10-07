'use client'

/**
 * Uploading photos from the admin, phone-proof.
 *
 * - Originals are kept at full size and quality (Aviv's choice).
 * - HEIC/HEIF (iPhone) is converted to a full-resolution JPEG, since most
 *   browsers can't show HEIC. iPhones usually convert on their own when a
 *   photo is picked in Safari; this catches the rest.
 * - Width and height are read before upload so the site can lay photos out
 *   without waiting for them to load.
 * - On the live site, files go straight to Vercel Blob (no server size limit);
 *   in local dev they go through /api/upload into public/uploads.
 */

export type UploadMode = 'local' | 'blob'

export interface PreparedFile {
  blob: Blob
  name: string
  type: string
  width?: number
  height?: number
}

const isHeic = (f: File) =>
  /image\/hei[cf]/i.test(f.type) || /\.(heic|heif)$/i.test(f.name)

async function decode(file: Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file)
  } catch {
    return null
  }
}

export async function prepareFile(file: File): Promise<PreparedFile> {
  const bitmap = await decode(file)

  if (isHeic(file)) {
    if (!bitmap) {
      throw new Error("This browser can't read HEIC photos. Upload it from your iPhone, or export it as JPG.")
    }
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
    const jpeg = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.95))
    if (!jpeg) throw new Error("Couldn't convert this HEIC photo.")
    return {
      blob: jpeg,
      name: file.name.replace(/\.(heic|heif)$/i, '') + '.jpg',
      type: 'image/jpeg',
      width: bitmap.width,
      height: bitmap.height,
    }
  }

  if (!/^image\/(jpeg|png|webp|avif|gif)$/i.test(file.type)) {
    throw new Error(`Not a supported photo type (${file.type || 'unknown'}).`)
  }
  return {
    blob: file,
    name: file.name,
    type: file.type,
    width: bitmap?.width,
    height: bitmap?.height,
  }
}

const safeName = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  return `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
}

/** Upload one prepared file; resolves to its public URL. */
export async function sendFile(
  file: PreparedFile,
  mode: UploadMode,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal
): Promise<string> {
  if (mode === 'blob') {
    const { upload } = await import('@vercel/blob/client')
    const result = await upload(safeName(file.name), file.blob, {
      access: 'public',
      handleUploadUrl: '/api/upload/client',
      contentType: file.type,
      multipart: file.blob.size > 8 * 1024 * 1024,
      abortSignal: signal,
      onUploadProgress: e => onProgress(e.percentage / 100),
    })
    return result.url
  }

  // Local dev: through the server, with progress via XHR.
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', new File([file.blob], file.name, { type: file.type }))
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.upload.onprogress = e => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300 && body.url) resolve(body.url)
        else reject(new Error(body.error ?? `Upload failed (${xhr.status})`))
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`))
      }
    }
    xhr.onerror = () => reject(new Error('No connection — tap Retry when you have signal.'))
    signal?.addEventListener('abort', () => xhr.abort())
    xhr.send(form)
  })
}
