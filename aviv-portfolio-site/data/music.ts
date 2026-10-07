/**
 * The desktop media player's playlist. Paste YouTube links here (any form:
 * youtube.com/watch?v=…, youtu.be/…, music.youtube.com/…). Every visit starts
 * on a random song, then shuffles through the rest. Titles come from YouTube.
 *
 * A link that includes a playlist or mix (…&list=…) plays that whole list
 * when it comes up — Next / Previous step through the list, and the player
 * moves on to the next link when the list runs out.
 */
/** Starting volume (0–100). The music tries to start by itself when the site
 *  opens; browsers that block sound until a click start it on the first click
 *  or key press instead. */
export const START_VOLUME = 50

export const PLAYLIST: string[] = [
  'https://www.youtube.com/watch?v=aL9rsf-62rM',
  'https://www.youtube.com/watch?v=mFZ7Rcx80X4',
  'https://www.youtube.com/watch?v=5dZgs9jSCoM&list=RDbZ1BbYqdizA&index=3',
  'https://www.youtube.com/watch?v=f0k0vS9OVjw',
  'https://www.youtube.com/watch?v=i1_QP8kMmj0&list=RDi1_QP8kMmj0&start_radio=1',
  'https://www.youtube.com/watch?v=bZ1BbYqdizA&list=RDbZ1BbYqdizA&start_radio=1',
]

/** Pull the 11-character video id out of any YouTube link. */
export function youtubeId(url: string): string | null {
  const m = url
    .trim()
    .match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

export interface Song {
  id: string
  /** a playlist or mix to keep playing after this video */
  list?: string
  /** 0-based position of the video in that list */
  index?: number
}

/** A playlist entry: the video, plus its playlist/mix if the link has one. */
export function parseSong(url: string): Song | null {
  const id = youtubeId(url)
  if (!id) return null
  const list = url.match(/[?&]list=([\w-]+)/)?.[1]
  const idx = Number(url.match(/[?&]index=(\d+)/)?.[1])
  return list ? { id, list, ...(idx > 0 ? { index: idx - 1 } : {}) } : { id }
}

/** Stable key for a song in the shuffle queue. */
export const songKey = (s: Song) => (s.list ? `${s.id}|${s.list}` : s.id)
