/**
 * DOS games playable on the site, in the browser, through js-dos (DOSBox
 * compiled to WebAssembly). Each game is a `.jsdos` bundle in public/games/:
 * a zip of the game's files plus `.jsdos/dosbox.conf`, whose [autoexec]
 * starts the game.
 */

/** js-dos v8 from its official CDN, loaded only when someone presses Play. */
export const JSDOS: { js: string; css: string; pathPrefix?: string } = {
  js: 'https://v8.js-dos.com/latest/js-dos.js',
  css: 'https://v8.js-dos.com/latest/js-dos.css',
  /** where the emulator (wasm) files live; unset = js-dos's own default */
  pathPrefix: undefined,
}

export interface Game {
  id: string
  /** shown on the desktop icon and window title */
  name: string
  subtitle: string
  bundle: string
  /** small colour picture for the desktop icon */
  icon: string
  /** the game's title screen, shown before it boots */
  cover: string
  /** a folder (made in the admin) whose photos show in the window's second tab */
  folderSlug: string
  folderTab: string
  /** photos that ship with the site (shown before any admin photos) */
  photos: { src: string; title: string }[]
  /** a call to action under the photos */
  shop?: { text: string; button: string; href: string }
  credits: string
  howTo: string
}

export const GAMES: Game[] = [
  {
    id: 'sochar-hayam',
    name: 'סוחר הים',
    subtitle: 'Sochar HaYam — The Sea Merchant',
    bundle: '/games/sochar-hayam/sochar-hayam.jsdos',
    icon: '/games/sochar-hayam/ship-icon.png',
    cover: '/games/sochar-hayam/title.png',
    folderSlug: 'sochar-hayam',
    folderTab: 'Clothing',
    photos: [
      { src: '/games/sochar-hayam/fashion/hoodie-black-front.jpg', title: 'Black hoodie — ship (front)' },
      { src: '/games/sochar-hayam/fashion/hoodie-black-back.jpg', title: 'Black hoodie — “sail at night?” (back)' },
      { src: '/games/sochar-hayam/fashion/hoodie-blue-back.jpg', title: 'Blue hoodie — the ship (back)' },
      { src: '/games/sochar-hayam/fashion/hoodie-blue-front-title.jpg', title: 'Blue hoodie — סוחר הים banner (front)' },
      { src: '/games/sochar-hayam/fashion/hoodie-blue-front-badges.jpg', title: 'Blue hoodie — badges (front)' },
    ],
    shop: {
      text: 'Want one? Slide into my DMs to cop one.',
      button: 'DM me on Instagram',
      href: 'https://ig.me/m/crispy1404',
    },
    credits:
      'Design & programming: Sam Glicksman, Ariela Zelinger, Tali Lebel · Programming: Kika Brooks, Sam Glicksman · Graphics: Arnona Rosin, Dani Pinchuk · Advisor: Prof. Gabriel Salomon',
    howTo: 'Click the game first so it gets your keyboard. Hebrew keyboard is on inside the game.',
  },
]

export const gameById = (id: string) => GAMES.find(g => g.id === id)
