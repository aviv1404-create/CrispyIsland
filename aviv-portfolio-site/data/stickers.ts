/**
 * The sticker collection. Finding one of the site's secrets slaps its sticker
 * onto the desktop (bottom-left, above Instagram/TikTok), where it stays —
 * still animated — for good (remembered in the visitor's browser). Once
 * found, a secret stops popping up on its own.
 *
 * To add a new sticker: add an entry here, then call collect('<id>') from
 * wherever that secret is found (see lib/stickers.ts).
 *
 *   image — GIF/PNG in public/
 *   title — shown on hover and in the "Sticker found!" note
 *   href  — clicking the sticker goes here (optional)
 *   action — instead of a link: 'guide' replays the guide's tour
 */
export interface Sticker {
  id: string
  image: string
  title: string
  href?: string
  action?: 'guide'
  /** shown size in px (height); the art keeps its proportions */
  size?: number
}

export const STICKERS: Sticker[] = [
  { id: 'goblin', image: '/secret/troll-cutout.gif', title: 'The Goblin — found the dungeon', href: '/secret', size: 130 },
  { id: 'pirate', image: '/secret/pirate/skull-hat.gif', title: 'The Pirate — found the secret port', href: '/secret/pirate', size: 96 },
  { id: 'guide', image: '/guide/wave.gif', title: 'The Guide — finished the tour', action: 'guide', size: 120 },
]

/** Show "2/3" next to the stickers (a hint there's more to find). */
export const SHOW_COUNT = true
