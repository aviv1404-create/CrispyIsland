/**
 * The second secret layer: Crispy's Secret Pirate Port (/secret/pirate),
 * reached from the bottom of the dungeon page. Put new GIFs in
 * public/secret/pirate/ and refer to them as '/secret/pirate/<file>'.
 */

export const PIRATE_ART = {
  skullBones: '/secret/pirate/skull-bones.gif',
  skullHat: '/secret/pirate/skull-hat.gif',
  ship: '/secret/pirate/ship.gif',
  pirate: '/secret/pirate/pirate.png',
  skullSwords: '/secret/pirate/skull-swords.gif',
  eyes: '/secret/pirate/eyes.png',
  /** old 468×60 web banner, shown between the page and the sea */
  banner: '/secret/pirate/banner-x-marks.gif',
}

/**
 * The pirate page's own cursor pack ("Pirate Pack"), shrunk to 48px.
 * x/y is the click point. Files in public/secret/pirate/cursor/.
 */
const pc = (name: string, x: number, y: number, fallback: string) =>
  `url(/secret/pirate/cursor/${name}.png) ${x} ${y}, ${fallback}`
export const PIRATE_CURSORS = {
  normal: pc('normal', 5, 3, 'auto'),
  link: pc('link', 5, 3, 'pointer'),
  text: pc('text', 4, 4, 'text'),
  help: pc('help', 2, 1, 'help'),
  busy: pc('busy', 2, 1, 'progress'),
  unavailable: pc('unavailable', 6, 3, 'not-allowed'),
  move: pc('move', 24, 24, 'move'),
}

/**
 * The pirate pop-up: when someone presses Play on סוחר הים, 1 in ODDS times
 * the skull drops onto the desktop a few seconds later. Clicking it opens the
 * pirate port. `?pirate` in the URL makes it show on every Play (for testing).
 */
export const PIRATE_POPUP = {
  odds: 2,
  /** wait this long after Play before it appears (ms) */
  delay: 6000,
  image: '/secret/pirate/skull-hat.gif',
  hint: 'Arr… follow me',
}

export const PIRATE_PAGE = {
  title: "CRiSPY'S SECRET PIRATE PORT",
  marquee:
    '~~~ AHOY MATEY ~~~ ye found the second layer ~~~ no landlubbers allowed ~~~ the port be under construction ~~~ come back when the tide turns ~~~',
  intro:
    "Arr! Ye climbed down past the dungeon and washed up in me secret port. The ships be still in the shipyard — the real treasure arrives soon.",
  /** the big stamp across the page; '' hides it */
  comingSoon: 'COMING SOON',
  /** what the pirate says in his speech bubble */
  says: 'Oi! Keep yer hands off me treasure!',
}

export interface PirateLink {
  label: string
  href: string
  note?: string
}

/** "The Shipyard" — classic LEGO pirate ships, linked to their BrickLink catalog pages. */
const BL = (n: string) => `https://www.bricklink.com/v2/catalog/catalogitem.page?S=${n}-1`
export const SHIPYARD: PirateLink[] = [
  { label: 'Black Seas Barracuda #6285', href: BL('6285'), note: '1989 · the Dark Shark' },
  { label: 'Caribbean Clipper #6274', href: BL('6274'), note: '1989 · Governor’s ship' },
  { label: 'Imperial Flagship #6271', href: BL('6271'), note: '1992 · HMS Sea Lion' },
  { label: "Skull's Eye Schooner #6286", href: BL('6286'), note: '1993 · the Black Skull' },
  { label: 'Renegade Runner #6268', href: BL('6268'), note: '1993 · Sea Vulture' },
  { label: 'Red Beard Runner #6289', href: BL('6289'), note: '1996 · Captain Redbeard’s ship' },
  { label: 'Armada Flagship #6280', href: BL('6280'), note: '1996 · the Santa Cruz' },
  { label: 'Black Seas Barracuda #10040', href: BL('10040'), note: '2002 · the reissue' },
]

/** Locked chests: future features. `title` shows on the chest. */
export const CHESTS = [
  { title: 'Treasure map' },
  { title: 'Sea shanties' },
  { title: "Captain's log" },
]
