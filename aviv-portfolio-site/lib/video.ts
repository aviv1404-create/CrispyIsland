export interface VideoEmbed {
  provider: 'youtube' | 'vimeo'
  embedSrc: string
}

export function getEmbedUrl(url: string): VideoEmbed | null {
  if (!url) return null
  const trimmed = url.trim()

  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([\w-]+)/
  )
  if (youtubeMatch) {
    return { provider: 'youtube', embedSrc: `https://www.youtube.com/embed/${youtubeMatch[1]}` }
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeoMatch) {
    return { provider: 'vimeo', embedSrc: `https://player.vimeo.com/video/${vimeoMatch[1]}` }
  }

  return null
}
