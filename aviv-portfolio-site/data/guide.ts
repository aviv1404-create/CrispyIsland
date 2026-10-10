/**
 * The little stick-figure guide for first-time visitors (desktop only).
 *
 * He walks up in the bottom-left corner a few seconds after the site opens and
 * says hi. Nothing happens unless the visitor clicks him: then he walks around
 * the desktop and explains things in speech bubbles. "Next ›" moves on, "×"
 * sends him away at any point. He only comes once per browser; right-click the
 * desktop → "Show the guide" brings him back.
 *
 * Sprites are GIFs in public/guide/. Each step picks a sprite and, optionally,
 * where he walks to first:
 *   'corner'  — the bottom-left corner (home)
 *   'icons'   — next to the folder icons (top right)
 *   'player'  — next to the music player
 *   'tv'      — next to the TV icon
 *   'center'  — the middle of the screen
 */

export const GUIDE = {
  enabled: true,
  /** wait this long after the site opens before he walks up (ms) */
  delay: 5000,
  /** shown height in px (the GIFs are 131px tall) */
  height: 92,
  /** the walk GIF faces left; flipped when walking right */
  walkFacesLeft: true,
  sprites: {
    walk: '/guide/walk.gif',
    wave: '/guide/wave.gif',
    point: '/guide/point.gif',
    sweep: '/guide/sweep.gif',
  },
  /** what he says before anyone clicks him */
  hello: 'Hi! First time here? Click me for a quick tour.',
}

export type GuideSprite = keyof typeof GUIDE.sprites
export type GuideSpot = 'corner' | 'icons' | 'player' | 'tv' | 'center'

export interface GuideStep {
  text: string
  sprite: GuideSprite
  /** walk here before talking (omit to stay put) */
  to?: GuideSpot
}

export const GUIDE_STEPS: GuideStep[] = [
  { text: 'Welcome to Crispy Island — this is Aviv’s desktop. Everything works like an old computer.', sprite: 'wave' },
  { text: 'His work lives in these folders: Photography, Cinema and Commercial. Double-click to open one.', sprite: 'point', to: 'icons' },
  { text: 'The TV plays his reels. Pick a tape from the shelf.', sprite: 'point', to: 'tv' },
  { text: 'That’s the Crispy Player — the music is his picks. Change the skin or the size if you like.', sprite: 'point', to: 'player' },
  { text: 'Drag icons and windows anywhere you want. Right-click for more. I’ll tidy up after you.', sprite: 'sweep', to: 'center' },
  { text: 'Psst… some things here are secret. Keep clicking around. Have fun!', sprite: 'wave', to: 'corner' },
]
