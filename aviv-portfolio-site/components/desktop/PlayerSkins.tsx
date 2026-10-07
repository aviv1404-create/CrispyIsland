'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Skins for the desktop media player, drawn by Aviv (public/skins/*.png).
 *
 * Each skin is his pixel art scaled up, with invisible hit areas laid over the
 * buttons he drew, and a live readout painted over its display. The YouTube
 * video can't live inside the art — YouTube requires its player to be at
 * least 200×200 — so it sits in a monitor docked on top of the skin. The
 * monitor is owned by MediaPlayer and never moves in the DOM, so switching
 * skins doesn't restart the song.
 */

type Rect = [x: number, y: number, w: number, h: number]
type Action = 'play' | 'prev' | 'next' | 'stop' | 'mute' | 'close' | 'size'

interface SkinDef {
  id: string
  name: string
  family: 'boombox' | 'face' | 'window' | 'ring' | 'orange' | 'crispy'
  w: number
  h: number
  /** clickable areas over the drawn buttons, in art pixels */
  hot: [Action, Rect][]
  /** where the song title goes; may sit just below the art */
  lcd: Rect
  /** optional live clock painted over a drawn time display */
  clock?: Rect
  lcdInk: string
  lcdBg: string
  /** where a seek bar is drawn (window skins) */
  seek?: Rect
  /** where a volume meter is drawn (window skins) */
  vol?: Rect
  /** monitor bezel colour, to match the skin */
  bezel: string
  /** a drawn screen big enough for the video: it plays inside the art
   *  instead of in a docked monitor */
  screen?: Rect
  /** a drawn track that gets a live progress fill */
  progress?: Rect
}

const BOOMBOX: Omit<SkinDef, 'id' | 'name' | 'w' | 'h'> = {
  family: 'boombox',
  hot: [
    ['play', [143, 84, 50, 40]],
    ['mute', [114, 70, 26, 24]],
    ['prev', [112, 126, 32, 24]],
    ['stop', [151, 126, 34, 24]],
    ['next', [191, 126, 34, 24]],
    ['mute', [18, 62, 92, 98]],
    ['mute', [226, 62, 92, 98]],
  ],
  lcd: [113, 40, 112, 20],
  lcdInk: '#c6ff3e',
  lcdBg: '#14200a',
  bezel: '#5fb526',
}

const FACE: Omit<SkinDef, 'id' | 'name' | 'w' | 'h'> = {
  family: 'face',
  hot: [
    ['mute', [12, 38, 28, 22]],
    ['prev', [44, 38, 32, 22]],
    ['stop', [200, 52, 18, 26]],
    ['play', [220, 52, 26, 26]],
    ['next', [250, 52, 34, 26]],
  ],
  lcd: [18, 158, 128, 22],
  lcdInk: '#c6ff3e',
  lcdBg: '#14200a',
  bezel: '#5fb526',
}

const WINDOW: Omit<SkinDef, 'id' | 'name' | 'w' | 'h'> = {
  family: 'window',
  hot: [
    ['prev', [12, 10, 26, 22]],
    ['mute', [180, 10, 20, 22]],
    ['play', [12, 126, 26, 24]],
    ['stop', [40, 126, 26, 24]],
    ['next', [68, 126, 26, 24]],
  ],
  lcd: [22, 104, 184, 16],
  lcdInk: '#1a1a1a',
  lcdBg: 'rgba(255, 255, 255, 0.55)',
  seek: [96, 130, 134, 16],
  vol: [214, 42, 30, 80],
  bezel: '#7d86d8',
}

const RING: Omit<SkinDef, 'id' | 'name' | 'w' | 'h'> = {
  family: 'ring',
  hot: [
    ['play', [140, 128, 36, 32]],
    ['next', [230, 90, 44, 34]],
    ['prev', [230, 128, 44, 34]],
    ['stop', [214, 48, 38, 36]],
    ['mute', [6, 84, 32, 58]],
  ],
  clock: [110, 66, 100, 32],
  lcd: [110, 100, 100, 20],
  lcdInk: '#ffb020',
  lcdBg: '#211b0c',
  bezel: '#4e6b2c',
}

const ORANGE: Omit<SkinDef, 'id' | 'name' | 'w' | 'h'> = {
  family: 'orange',
  hot: [
    ['prev', [90, 142, 32, 30]],
    ['play', [122, 142, 32, 30]],
    ['next', [154, 142, 32, 30]],
    ['mute', [236, 76, 46, 52]],
    ['stop', [226, 142, 34, 34]],
  ],
  lcd: [88, 70, 108, 20],
  lcdInk: '#ffb020',
  lcdBg: '#1d150a',
  bezel: '#e2702a',
}

/** "Crispy Player" — a glossy blue window with the video in its own screen.
 *  High-res art (622×852), laid out here at 1/2.88 scale. */
const CRISPY_BLUE: SkinDef = {
  id: 'crispy-blue',
  name: 'Crispy Player',
  family: 'crispy',
  w: 216,
  h: 296,
  hot: [
    ['play', [10.4, 254.5, 31.9, 31.9]],
    ['stop', [47.2, 259.8, 22.2, 22.2]],
    ['prev', [84.4, 259.8, 22.2, 22.2]],
    ['next', [112.9, 259.8, 22.2, 22.2]],
    ['mute', [148.6, 262.2, 13.9, 13.9]],
    ['play', [34.7, 34, 21.5, 11.8]],
    ['close', [152.8, 8.7, 17.4, 16.7]],
    ['size', [172.9, 8.7, 17.4, 16.7]],
    ['close', [192.7, 8.7, 18.1, 16.7]],
  ],
  screen: [12.5, 77.8, 193.8, 137.5],
  lcd: [33, 217.4, 170.9, 12.5],
  clock: [142.4, 55.6, 64.2, 16.7],
  lcdInk: '#bfe3ff',
  lcdBg: 'transparent',
  seek: [20.8, 233.5, 176.4, 10.8],
  progress: [20.8, 234.8, 176.4, 8.3],
  vol: [162.5, 261.1, 45.8, 15.3],
  bezel: '#3a6fd0',
}

const def = (id: string, name: string, w: number, h: number, base: typeof BOOMBOX): SkinDef => ({
  id,
  name,
  w,
  h,
  ...base,
})

const SKIN_DEFS = [
  def('boombox-1', 'Boombox', 328, 170, BOOMBOX),
  def('boombox-2', 'Boombox EQ', 330, 176, BOOMBOX),
  def('boombox-3', 'Boombox Tape', 337, 169, BOOMBOX),
  def('face-1', 'Green Face', 321, 195, FACE),
  def('face-2', 'Green Face Wave', 320, 192, FACE),
  def('face-3', 'Green Face Cam', 331, 193, FACE),
  def('window-1', 'Chick', 256, 162, WINDOW),
  def('window-2', 'Chick Dance', 262, 159, WINDOW),
  def('window-3', 'Chick Flap', 265, 159, WINDOW),
  def('ring-1', 'Field Scope', 280, 205, RING),
  def('ring-2', 'Field Clock', 288, 205, RING),
  def('ring-3', 'Field Radar', 279, 205, RING),
  def('orange-2', 'Rust EQ', 298, 224, ORANGE),
  def('orange-3', 'Rust Wave', 298, 224, ORANGE),
  CRISPY_BLUE as SkinDef & { id: 'crispy-blue' },
] as const

export const SKINS = SKIN_DEFS.map(d => ({ id: d.id, name: d.name, family: d.family }))
export type SkinId = (typeof SKIN_DEFS)[number]['id']
export const DEFAULT_SKIN: SkinId = 'crispy-blue'
/** The narrowest skin, used on phones. */
export const MOBILE_SKIN: SkinId = 'window-2'

export function skinDef(id: string): SkinDef {
  return SKIN_DEFS.find(d => d.id === id) ?? SKIN_DEFS[0]
}

export const SIZES = [
  { id: 's', label: 'S', scale: 0.7 },
  { id: 'm', label: 'M', scale: 0.85 },
  { id: 'l', label: 'L', scale: 1 },
] as const
export type SizeId = (typeof SIZES)[number]['id']

// ── Geometry ──────────────────────────────────────────
/** Art is drawn at 1.5× its pixel size at the "L" setting. */
export const ART_SCALE = 1.5
/** The docked video monitor, before the S/M/L scale. The scale is a CSS
 *  transform, so the video frame itself stays 240px — YouTube needs ≥ 200. */
const SCREEN = { w: 240, h: 236 }
const BEZEL = 8
const GAP = 10
const CAPS_H = 24

export interface SkinLayout {
  /** whole player box, before the S/M/L scale */
  w: number
  h: number
  screen: { x: number; y: number; w: number; h: number }
  art: { x: number; y: number; w: number; h: number }
}

export function skinLayout(id: string): SkinLayout {
  const d = skinDef(id)
  if (d.screen) {
    // The video plays inside the drawn screen; no docked monitor.
    const k = ART_SCALE
    const art = { x: 0, y: CAPS_H, w: d.w * k, h: d.h * k }
    const screen = { x: d.screen[0] * k, y: CAPS_H + d.screen[1] * k, w: d.screen[2] * k, h: d.screen[3] * k }
    return { w: art.w, h: art.y + art.h, screen, art }
  }
  const artW = d.w * ART_SCALE
  // the title strip can hang just below the art
  const artH = Math.max(d.h, d.lcd[1] + d.lcd[3]) * ART_SCALE
  const monitorW = SCREEN.w + BEZEL * 2
  const w = Math.max(artW, monitorW)
  const screen = { x: (w - SCREEN.w) / 2, y: CAPS_H + BEZEL, w: SCREEN.w, h: SCREEN.h }
  const art = { x: (w - artW) / 2, y: CAPS_H + SCREEN.h + BEZEL * 2 + GAP, w: artW, h: artH }
  return { w, h: art.y + artH, screen, art }
}

export interface Controls {
  playing: boolean
  hasSongs: boolean
  canSkip: boolean
  muted: boolean
  volume: number
  cur: number
  dur: number
  lcd: string
  track: string
  time: string
  status: string
  skin: SkinId
  size: SizeId
  onPlayPause: () => void
  onStop: () => void
  onPrev: () => void
  onNext: () => void
  onMute: () => void
  onVolume: (v: number) => void
  onSeek: (s: number) => void
  onSkin: (s: SkinId) => void
  onSize: () => void
  onClose: () => void
}

// ── The skin ──────────────────────────────────────────
const LABELS: Record<Action, (c: Controls) => string> = {
  play: c => (c.playing ? 'Pause' : 'Play'),
  prev: () => 'Previous song',
  next: () => 'Next song',
  stop: () => 'Stop',
  mute: c => (c.muted ? 'Unmute' : 'Mute'),
  close: () => 'Close player',
  size: () => 'Change size',
}

export function Skin({ c }: { c: Controls }) {
  const d = skinDef(c.skin)
  const L = skinLayout(d.id)
  const k = ART_SCALE
  const at = (r: Rect): React.CSSProperties => ({
    left: L.art.x + r[0] * k,
    top: L.art.y + r[1] * k,
    width: r[2] * k,
    height: r[3] * k,
  })
  const run: Record<Action, () => void> = {
    play: c.onPlayPause,
    prev: c.onPrev,
    next: c.onNext,
    stop: c.onStop,
    mute: c.onMute,
    close: c.onClose,
    size: c.onSize,
  }
  const disabled = (a: Action) =>
    a === 'close' || a === 'size' ? false : a === 'prev' || a === 'next' ? !c.canSkip : !c.hasSongs
  // Only the first hit area per action is announced; the rest (e.g. both
  // boombox speakers for mute) are extra click targets.
  const seen = new Set<Action>()

  return (
    <>
      {!d.screen && (
      <div
        className="mp-monitor"
        style={{
          left: L.screen.x - BEZEL,
          top: L.screen.y - BEZEL,
          width: L.screen.w + BEZEL * 2,
          height: L.screen.h + BEZEL * 2,
          ['--bezel' as string]: d.bezel,
        }}
        aria-hidden="true"
      />
      )}
      <img
        className={`mp-art fam-${d.family}`}
        src={`/skins/${d.id}.png`}
        alt=""
        draggable={false}
        style={{ left: L.art.x, top: L.art.y, width: d.w * k, height: d.h * k }}
      />

      {d.clock && (
        <span className="mp-clock" style={{ ...at(d.clock), color: d.lcdInk, background: d.lcdBg }}>
          {c.time}
        </span>
      )}
      <div className="mp-lcd mp-lcd-pix" style={{ ...at(d.lcd), color: d.lcdInk, background: d.lcdBg }} aria-live="polite">
        <span className="mp-lcd-title">
          <span className={c.lcd.length > 16 ? 'scroll' : ''}>{c.lcd}</span>
        </span>
        {!d.clock && <span className="mp-lcd-time">{c.time}</span>}
      </div>

      {d.hot.map(([a, r], i) => {
        const first = !seen.has(a)
        seen.add(a)
        return (
          <button
            key={i}
            type="button"
            className={`mp-hot${a === 'play' && c.playing ? ' down' : ''}${a === 'mute' && c.muted ? ' down' : ''}`}
            style={at(r)}
            onClick={run[a]}
            disabled={disabled(a)}
            aria-label={LABELS[a](c)}
            title={LABELS[a](c)}
            tabIndex={first ? 0 : -1}
            aria-hidden={first ? undefined : true}
          />
        )
      })}

      {d.progress && (
        <span className="mp-progress" style={at(d.progress)} aria-hidden="true">
          <span style={{ width: `${c.dur ? Math.min(100, (c.cur / c.dur) * 100) : 0}%` }} />
        </span>
      )}
      {d.seek && (
        <input
          className="mp-hot-range"
          type="range"
          min={0}
          max={Math.max(1, Math.floor(c.dur))}
          value={Math.floor(c.cur)}
          onChange={e => c.onSeek(Number(e.target.value))}
          aria-label="Seek"
          disabled={!c.dur}
          style={at(d.seek)}
        />
      )}
      {d.vol && (
        <input
          className={`mp-hot-range${d.vol[3] > d.vol[2] ? ' vertical' : ''}`}
          type="range"
          min={0}
          max={100}
          value={c.muted ? 0 : c.volume}
          onChange={e => c.onVolume(Number(e.target.value))}
          aria-label="Volume"
          style={at(d.vol)}
        />
      )}

      <Caps c={c} />
    </>
  )
}

/** Skin menu (with thumbnails and volume), size and close. */
function Caps({ c }: { c: Controls }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const off = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', off, true)
    return () => document.removeEventListener('pointerdown', off, true)
  }, [open])
  const size = SIZES.find(s => s.id === c.size)!
  const v = c.muted ? 0 : c.volume

  return (
    <div className="mp-caps" ref={ref}>
      <button
        type="button"
        className="mp-cap mp-cap-skin"
        onClick={() => setOpen(o => !o)}
        aria-label="Change skin"
        aria-expanded={open}
        title="Change skin"
      >
        <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true">
          <path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1 0-.9.7-1.6 1.6-1.6h1.9A4.8 4.8 0 0 0 21 11c0-4.4-4-8-9-8zM6.5 12a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
        </svg>
      </button>
      <button
        type="button"
        className="mp-cap mp-cap-size"
        onClick={c.onSize}
        aria-label={`Player size ${size.label}, change size`}
        title="Change size"
      >
        {size.label}
      </button>
      <button type="button" className="mp-cap mp-cap-x" onClick={c.onClose} aria-label="Close player" title="Close">
        ×
      </button>

      {open && (
        <div className="mp-skins" role="menu" aria-label="Skins">
          <label className="mp-skins-vol">
            <span>Volume</span>
            <input
              className="mp-range"
              type="range"
              min={0}
              max={100}
              value={v}
              onChange={e => c.onVolume(Number(e.target.value))}
              style={{ ['--fill' as string]: `${v}%` }}
            />
          </label>
          <p>Skins</p>
          <div className="mp-skins-grid">
            {SKINS.map(s => (
              <button
                key={s.id}
                type="button"
                role="menuitemradio"
                aria-checked={c.skin === s.id}
                className={c.skin === s.id ? 'on' : ''}
                onClick={() => {
                  c.onSkin(s.id as SkinId)
                  setOpen(false)
                }}
                title={s.name}
              >
                <img src={`/skins/${s.id}.png`} alt="" />
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
