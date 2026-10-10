/**
 * Art in the middle of the desktop. Drop an image into public/ and set its
 * path here (e.g. '/desktop-art.png'); null leaves the desktop clear.
 */
export const DESKTOP_ART: string | null = null

/**
 * Where the desktop icons sit when the site opens (computers only — phones
 * use a plain grid). Each spot is measured in px from an edge of the desktop.
 * Visitors can still drag icons around; "Clean Up" puts them back here.
 * Icons not listed (e.g. the player icon after closing the player) line up
 * on the right, under the top group.
 * Ids: root folders 'f:photography' / 'f:cinema' / 'f:commercial', 'about',
 * 'instagram', 'tiktok', 'tv', 'events', 'game:sochar-hayam'.
 */
const COL = 112 // one icon column
const ROW = 114 // one icon row
export const DESK_LAYOUT: Record<string, { left?: number; right?: number; top?: number; bottom?: number }> = {
  // top-right block, two columns × three rows
  'f:cinema': { right: COL, top: 0 },
  'f:commercial': { right: 0, top: 0 },
  about: { right: COL, top: ROW },
  'f:photography': { right: 0, top: ROW },
  tv: { right: COL, top: ROW * 2 },
  events: { right: 0, top: ROW * 2 },
  // bottom-left
  instagram: { left: 0, bottom: 0 },
  tiktok: { left: 108, bottom: 0 },
  // bottom-right
  'game:sochar-hayam': { right: 0, bottom: 0 },
}
