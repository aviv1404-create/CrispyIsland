/**
 * The secret 90s page (/secret) and the yellow pop-up that leads to it.
 *
 * Everything Aviv may want to change lives here: the odds, the bubble text,
 * the GIF that gets copied all over the page, the cursor, and the archive.
 * Put new files in public/secret/ and refer to them as '/secret/<file>'.
 */

/** 1 in ODDS visits get the pop-up (rolled once per visit, not per page). */
export const ODDS = 4
/** true = show the pop-up on every visit (for testing / previews). */
export const ALWAYS = false

/** The pop-up on the desktop: the goblin GIF runs in and waits to be clicked. */
export const BUBBLE = {
  image: '/secret/troll-cutout.gif',
  /** shown on hover only */
  hint: '???',
}

/** The GIF tiled all over the background. */
export const GIF = '/secret/troll.gif'
/** Size of one background tile, in px (the GIF is 269×350). */
export const TILE = 150

/** Extra pictures scattered over the background, outside the blue box.
 *  Off (0) — the background is just the goblin tiles; Aviv's drawings live
 *  inside the blue box. Raise the count to bring the scatter back. */
export const DECOR = ['/secret/crystal.png', '/secret/heart.png', '/secret/smiley.png', '/secret/troll.gif']
export const GIF_COUNT = 0

/** Graphics used in the page layout (Aviv's drawings). */
export const ART = {
  logo: '/secret/bubble-crispy.png',
  smiley: '/secret/smiley.png',
  smileyWhite: '/secret/smiley-white.png',
  crystal: '/secret/crystal.png',
  heart: '/secret/heart.png',
  faceLeft: '/secret/face-side.png',
  faceRight: '/secret/face-smoke.png',
}
/**
 * The secret page's cursor pack: "Bejeweled Red Swords" by Billy1905
 * (rw-designer.com, public domain), converted to PNG. x/y is the click point.
 */
const cur = (name: string, x: number, y: number, fallback: string) =>
  `url(/secret/cursor/${name}.png) ${x} ${y}, ${fallback}`
export const CURSORS = {
  normal: cur('normal', 0, 0, 'auto'),
  link: cur('link', 12, 5, 'pointer'),
  text: cur('text', 16, 15, 'text'),
  help: cur('help', 0, 0, 'help'),
  busy: cur('busy', 0, 0, 'progress'),
  unavailable: cur('unavailable', 15, 15, 'not-allowed'),
  move: cur('move', 16, 15, 'move'),
}

export const PAGE = {
  title: "CRiSPY'S DUNGEON LAYER",
  marquee:
    "*** WELCOME 2 CRISPY'S DUNGEON LAYER *** u found the secret page *** crispy works *** weird stuff *** the archive *** come back soon ***",
  intro:
    'U found it!! This is the dungeon under my site. Weird stuff, and a little archive of things from the internet and my hard drive.',
  updated: 'Under construction since forever',
}

export interface SecretWork {
  /** image or GIF; leave empty for a "coming soon" box */
  src?: string
  title: string
  /** optional link (a video, a page, anything) */
  href?: string
}

export interface SecretLink {
  label: string
  href: string
  note?: string
  /** optional picture shown with the item */
  thumb?: string
}

/** "Crispy works" — a grid of Aviv's pictures. Empty entries show "coming soon". */
export const WORKS: SecretWork[] = [
  { src: '/secret/works/neon-figure.jpg', title: 'neon figure', href: '/secret/works/neon-figure.jpg' },
  { src: '/secret/works/smoker.png', title: 'smoker', href: '/secret/works/smoker.png' },
  { src: '/secret/works/visor.png', title: 'visor', href: '/secret/works/visor.png' },
  { src: '/secret/works/zigzag.png', title: 'zigzag', href: '/secret/works/zigzag.png' },
  { src: '/secret/works/upside-down.png', title: 'upside down', href: '/secret/works/upside-down.png' },
  { title: 'untitled #6' },
]

/** "The archive" — a mini internet archive: links, files, finds. */
export const ARCHIVE: { heading: string; items: SecretLink[] }[] = [
  {
    heading: 'Cool links',
    items: [
      { label: 'KHInsider — video game music archive', href: 'https://downloads.khinsider.com/', note: 'soundtracks from old games' },
      { label: 'The Regev Archive', href: 'https://tomregev.neocities.org/', note: 'tomregev.neocities.org' },
    ],
  },
  {
    heading: 'Stuff I found',
    items: [
      { label: 'more coming soon...', href: '#', note: 'archive loading' },
    ],
  },
]

/** Only for the chat preview (no server there): where the code box sends you. Empty on the real site. */
export const ADMIN_DEMO_URL = ''
