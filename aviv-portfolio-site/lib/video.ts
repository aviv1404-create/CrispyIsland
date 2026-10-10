export interface VideoEmbed {
  provider: 'youtube' | 'vimeo'
  embedSrc: string
  /** a YouTube playlist: YouTube plays through it by itself */
  playlist?: boolean
}

export function getEmbedUrl(url: string): VideoEmbed | null {
  if (!url) return null
  const trimmed = url.trim()

  // A YouTube playlist link (youtube.com/playlist?list=…): play the whole
  // list. A single-video link that happens to carry &list= stays one video.
  const listMatch = trimmed.match(/youtube\.com\/(?:playlist|embed\/videoseries)\?(?:.*&)?list=([\w-]+)/)
  if (listMatch) {
    return {
      provider: 'youtube',
      embedSrc: `https://www.youtube.com/embed/videoseries?list=${listMatch[1]}`,
      playlist: true,
    }
  }

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
