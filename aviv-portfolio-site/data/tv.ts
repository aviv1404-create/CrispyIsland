/**
 * The TV on the desktop: VHS tapes on a shelf, each one a video.
 * Paste a YouTube or Vimeo link in `video`. A tape without a link shows
 * static and "NO SIGNAL" — handy as a placeholder until the edit is done.
 * The first tape is what's in the deck when the TV opens.
 */
export interface Tape {
  id: string
  /** written on the spine */
  title: string
  /** small text under the title, e.g. year or client */
  sub?: string
  video?: string
  /** spine colour */
  color: string
  /** a picture instead of written text: shown on the spine and on the TV when
   *  the tape has no video yet. Put the file in public/tv/. */
  art?: string
}

export const TAPES: Tape[] = [
  { id: 'showreel', title: 'SHOWREEL', sub: '2026', color: '#e8322a' },
  { id: 'dop', title: 'DOP REEL', sub: 'cinematography', color: '#2a6be8' },
  { id: 'music', title: 'MUSIC VIDEOS', color: '#f2c12e' },
  { id: 'tape-exclusive', title: 'TAPE EXCLUSIVE', art: '/tv/tape-exclusive.png', color: '#000000' },
]
