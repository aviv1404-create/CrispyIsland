/** The fake loading screen shown when someone opens the site. */
export const BOOT = {
  logo: '/brand/crispy-island.png',
  /** how long the 1% → 100% count takes */
  ms: 2000,
  text: 'loading CrispyIsland…',
  /** intro sound, e.g. '/audio/boot.mp3' (put the file in public/audio/). Empty = silent. */
  sound: '',
  volume: 0.6,
  /** false = once per visit; true = every page load */
  everyTime: false,
}
