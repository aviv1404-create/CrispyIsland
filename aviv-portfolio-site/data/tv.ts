/**
 * The TV on the desktop: VHS tapes on a shelf, each one a channel.
 *
 * Channels and their videos are edited in /admin → "TV". This file is only
 * the starting list, used until the first edit there. A tape with no videos
 * shows static and "NO SIGNAL" (or its `art`, if it has one).
 * The first tape is what's in the deck when the TV opens.
 */
import type { Tree, TvTape } from '@/lib/types'

export type Tape = TvTape

export const TAPES: Tape[] = [
  { id: 'showreel', title: 'SHOWREEL', sub: '2026', color: '#e8322a', videos: [] },
  { id: 'dop', title: 'DOP REEL', sub: 'cinematography', color: '#2a6be8', videos: [] },
  { id: 'music', title: 'MUSIC VIDEOS', color: '#f2c12e', videos: [] },
  {
    id: 'tape-exclusive',
    title: 'TAPE EXCLUSIVE',
    art: '/tv/tape-exclusive.png',
    color: '#000000',
    // starts on a random video each time, then plays the list shuffled
    order: 'shuffle',
    // the "קריספי טייפ" YouTube playlist — plays through and loops
    videos: [{ id: 'crispy-tape', title: 'קריספי טייפ', url: 'https://www.youtube.com/playlist?list=PLJWK9y5PScgk' }],
  },
]

/** The channels to show: the admin's list, else the starting list above. */
export const tapesOf = (tree: Tree): Tape[] => tree.tv?.tapes ?? TAPES
