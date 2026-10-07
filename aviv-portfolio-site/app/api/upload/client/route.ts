import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * Direct-to-Blob uploads. The browser asks this route for a short-lived
 * upload token, then sends the file straight to Vercel Blob — so full-size
 * originals from a phone never pass through (or hit the size limit of) a
 * serverless function.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody

  // Only a signed-in admin may get a token. The later "upload completed"
  // callback comes from Vercel itself and is verified by handleUpload.
  if (body.type === 'blob.generate-client-token') {
    const denied = await requireAdmin()
    if (denied) return denied
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async pathname => {
        if (!pathname.startsWith('uploads/')) throw new Error('Uploads must go under uploads/')
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
          maximumSizeInBytes: 200 * 1024 * 1024,
          addRandomSuffix: true,
        }
      },
      // The admin saves the new URL into the tree itself once the upload resolves.
      onUploadCompleted: async () => {},
    })
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return Response.json({ error: message }, { status: 400 })
  }
}
