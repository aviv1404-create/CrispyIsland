'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PLAYLIST, START_VOLUME, parseSong, songKey, type Song } from '@/data/music'
import {
  DEFAULT_SKIN,
  MOBILE_SKIN,
  SIZES,
  SKINS,
  Skin,
  skinLayout,
  type Controls,
  type SizeId,
  type SkinId,
} from './PlayerSkins'
import { LitePlayer } from './yt-lite'

// ── Minimal typing for the YouTube IFrame API ─────────
interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  loadVideoById(id: string): void
  cueVideoById(id: string): void
  loadPlaylist(opts: { list: string; listType?: string; index?: number }): void
  nextVideo(): void
  previousVideo(): void
  getPlaylist(): string[] | null
  getPlaylistIndex(): number
  mute(): void
  unMute(): void
  setVolume(v: number): void
  getCurrentTime(): number
  getDuration(): number
  seekTo(s: number, allowSeekAhead: boolean): void
  getVideoData(): { title?: string; author?: string }
  destroy(): void
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer
}
declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YTNamespace> | null = null
const LITE: YTNamespace = { Player: LitePlayer as unknown as YTNamespace['Player'] }
/**
 * The official YouTube script, or — if it's blocked or doesn't arrive within
 * a few seconds — the postMessage stand-in in ./yt-lite, so the player still
 * works behind ad blockers and on hosts that only allow their own scripts.
 */
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  apiPromise ??= new Promise(resolve => {
    let done = false
    const finish = (api: YTNamespace) => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve(api)
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      finish(window.YT!)
    }
    const timer = setTimeout(() => finish(LITE), 6000)
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.async = true
    s.onerror = () => finish(LITE)
    document.head.appendChild(s)
  })
  return apiPromise
}

// ── Shuffle: a different first song every visit ──────
const LAST_KEY = 'player:last'
const POS_KEY = 'player:pos'
const SKIN_KEY = 'player:skin'
const SIZE_KEY = 'player:size'

function shuffledQueue(ids: string[]): string[] {
  const q = [...ids]
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[q[i], q[j]] = [q[j], q[i]]
  }
  // Don't open on the song this visitor heard first last time.
  let last: string | null = null
  try {
    last = localStorage.getItem(LAST_KEY)
  } catch {}
  if (q.length > 1 && q[0] === last) q.push(q.shift()!)
  try {
    localStorage.setItem(LAST_KEY, q[0])
  } catch {}
  return q
}

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

type Status = 'loading' | 'ready' | 'playing' | 'paused' | 'stopped' | 'empty' | 'error' | 'offline'

/**
 * A skinned media player in the spirit of the early-2000s desktop players:
 * chrome hub of transport buttons, a bezelled screen with the video in it,
 * an LCD readout and a seek bar. It floats on the desktop like an icon —
 * drag it anywhere, close it, reopen it from the desktop.
 *
 * Browsers won't play sound before the visitor interacts with the page, so
 * the first song is cued on load and starts on the first click or key press.
 */
export default function MediaPlayer({
  isMobile,
  onClose,
}: {
  isMobile: boolean
  onClose: () => void
}) {
  // Each entry is keyed so a video and a mix starting on it stay distinct.
  const songs = useRef(
    new Map(
      PLAYLIST.map(parseSong)
        .filter((x): x is Song => !!x)
        .map(sg => [songKey(sg), sg] as const)
    )
  )
  const ids = useRef<string[]>([...songs.current.keys()])
  const songAt = (key: string | undefined) => (key ? songs.current.get(key) : undefined)
  /** the entry now playing is a playlist/mix */
  const inList = () => !!songAt(queueRef.current[atRef.current])?.list
  const lastState = useRef(-1)
  const [queue, setQueue] = useState<string[]>([])
  const [at, setAt] = useState(0)
  const [status, setStatus] = useState<Status>(ids.current.length ? 'loading' : 'empty')
  const [title, setTitle] = useState('')
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(START_VOLUME)
  const [time, setTime] = useState({ cur: 0, dur: 0 })

  const screenRef = useRef<HTMLDivElement>(null)
  const player = useRef<YTPlayer | null>(null)
  const userStopped = useRef(false)
  /** a tape is playing on the TV: don't start the music over it */
  const tvPlaying = useRef(false)
  const queueRef = useRef<string[]>([])
  const atRef = useRef(0)

  // ── Boot: shuffle, load the API, cue the first song ──
  useEffect(() => {
    if (!ids.current.length) return
    const q = shuffledQueue(ids.current)
    queueRef.current = q
    setQueue(q)
    let cancelled = false

    loadYouTubeApi().then(YT => {
      if (cancelled || !screenRef.current) return
      const mount = document.createElement('div')
      screenRef.current.appendChild(mount)
      player.current = new YT.Player(mount, {
        host: 'https://www.youtube-nocookie.com',
        videoId: songAt(q[0])!.id,
        width: '100%',
        height: '100%',
        playerVars: {
          ...(songAt(q[0])!.list ? { list: songAt(q[0])!.list, listType: 'playlist' } : {}),
          controls: 0, disablekb: 1, modestbranding: 1, playsinline: 1, rel: 0, fs: 0, iv_load_policy: 3 },
        events: {
          onReady: () => {
            player.current?.setVolume(START_VOLUME)
            setStatus(st => (st === 'loading' || st === 'offline' ? 'ready' : st))
            // Try to start right away; if the browser blocks sound before a
            // click, the first-interaction start below takes over.
            if (!userStopped.current && !tvPlaying.current) player.current?.playVideo()
          },
          onStateChange: (e: { data: number }) => {
            // -1 unstarted · 0 ended · 1 playing · 2 paused · 3 buffering · 5 cued
            lastState.current = e.data
            if (e.data === 1) {
              setStatus('playing')
              setTitle(player.current?.getVideoData().title ?? '')
            } else if (e.data === 2) setStatus(s => (s === 'stopped' ? s : 'paused'))
            else if (e.data === 0) {
              if (!inList()) skip(1)
              else
                // In a mix, YouTube usually moves on by itself; if it hasn't
                // a moment later, step forward (or leave the mix at its end).
                setTimeout(() => {
                  if (lastState.current === 0) next()
                }, 1500)
            }
            else if (e.data === 5) setTitle(player.current?.getVideoData().title ?? '')
          },
          // Removed or embed-blocked video: move on — unless it's the only
          // one, where skipping would just retry it forever.
          onError: () => {
            if (inList()) next()
            else if (queueRef.current.length > 1) skip(1)
            else setStatus('error')
          },
        },
      })
    })

    // If YouTube never answers (blocked network, no connection), say so
    // instead of showing "Loading…" forever.
    const giveUp = setTimeout(() => {
      if (!cancelled) setStatus(st => (st === 'loading' ? 'offline' : st))
    }, 15000)

    return () => {
      cancelled = true
      clearTimeout(giveUp)
      player.current?.destroy()
      player.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Start on the visitor's first interaction ─────────
  useEffect(() => {
    if (status !== 'ready') return
    const start = () => {
      if (!userStopped.current && !tvPlaying.current) player.current?.playVideo()
      cleanup()
    }
    const cleanup = () => {
      document.removeEventListener('pointerdown', start, true)
      document.removeEventListener('keydown', start, true)
    }
    document.addEventListener('pointerdown', start, true)
    document.addEventListener('keydown', start, true)
    return cleanup
  }, [status])

  // ── Pause when a tape starts on the TV ───────────────
  useEffect(() => {
    const pause = () => {
      tvPlaying.current = true
      player.current?.pauseVideo()
    }
    const stopped = () => {
      tvPlaying.current = false
    }
    window.addEventListener('crispy:tv-play', pause)
    window.addEventListener('crispy:tv-stop', stopped)
    return () => {
      window.removeEventListener('crispy:tv-play', pause)
      window.removeEventListener('crispy:tv-stop', stopped)
    }
  }, [])

  // ── Progress ─────────────────────────────────────────
  useEffect(() => {
    if (status !== 'playing') return
    const t = setInterval(() => {
      const p = player.current
      if (p) setTime({ cur: p.getCurrentTime(), dur: p.getDuration() })
    }, 500)
    return () => clearInterval(t)
  }, [status])

  const skip = useCallback((delta: number) => {
    const q = queueRef.current
    if (!q.length || !player.current) return
    const next = (atRef.current + delta + q.length) % q.length
    atRef.current = next
    setAt(next)
    setTime({ cur: 0, dur: 0 })
    userStopped.current = false
    const song = songAt(q[next])!
    if (song.list) player.current.loadPlaylist({ list: song.list, listType: 'playlist', index: song.index ?? 0 })
    else player.current.loadVideoById(song.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Next / Previous: inside a mix they move through it, otherwise the queue. */
  const next = () => {
    const p = player.current
    const list = p?.getPlaylist()
    if (p && inList() && list && p.getPlaylistIndex() < list.length - 1) {
      setTime({ cur: 0, dur: 0 })
      p.nextVideo()
    } else skip(1)
  }
  const prev = () => {
    const p = player.current
    if (p && inList() && p.getPlaylistIndex() > 0) {
      setTime({ cur: 0, dur: 0 })
      p.previousVideo()
    } else skip(-1)
  }

  const playPause = () => {
    const p = player.current
    if (!p) return
    userStopped.current = false
    if (status === 'playing') p.pauseVideo()
    else p.playVideo()
  }

  const stop = () => {
    userStopped.current = true
    player.current?.stopVideo()
    setStatus('stopped')
    setTime(t => ({ ...t, cur: 0 }))
  }

  const toggleMute = () => {
    const p = player.current
    if (!p) return
    if (muted) p.unMute()
    else p.mute()
    setMuted(!muted)
  }

  const changeVolume = (v: number) => {
    setVolume(v)
    player.current?.setVolume(v)
    if (muted && v > 0) {
      player.current?.unMute()
      setMuted(false)
    }
  }

  // ── Drag the whole player around the desktop ─────────
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_KEY)
      if (raw) setPos(JSON.parse(raw))
    } catch {}
  }, [])

  const startDrag = (e: React.PointerEvent) => {
    if (isMobile || e.button !== 0) return
    if ((e.target as HTMLElement).closest('button, input, label, .mp-screen, .mp-skins')) return
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return
    e.preventDefault()
    const x0 = el.offsetLeft
    const y0 = el.offsetTop
    const sx = e.clientX
    const sy = e.clientY
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    el.classList.add('dragging')
    let last = { x: x0, y: y0 }
    const move = (ev: PointerEvent) => {
      last = {
        x: Math.min(Math.max(x0 + ev.clientX - sx, -el.offsetWidth + 80), parent.clientWidth - 80),
        y: Math.min(Math.max(y0 + ev.clientY - sy, 0), parent.clientHeight - 60),
      }
      setPos(last)
    }
    const up = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      el.classList.remove('dragging')
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(last))
      } catch {}
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
  }

  // ── Skin + size, remembered per visitor ─────────────
  const [skin, setSkin] = useState<SkinId>(DEFAULT_SKIN)
  const [size, setSize] = useState<SizeId>('m')
  useEffect(() => {
    try {
      const sk = localStorage.getItem(SKIN_KEY)
      if (SKINS.some(x => x.id === sk)) setSkin(sk as SkinId)
      const sz = localStorage.getItem(SIZE_KEY)
      if (SIZES.some(x => x.id === sz)) setSize(sz as SizeId)
    } catch {}
  }, [])
  const chooseSkin = (id: SkinId) => {
    setSkin(id)
    try {
      localStorage.setItem(SKIN_KEY, id)
    } catch {}
  }
  const cycleSize = () => {
    const next = SIZES[(SIZES.findIndex(x => x.id === size) + 1) % SIZES.length].id
    setSize(next)
    try {
      localStorage.setItem(SIZE_KEY, next)
    } catch {}
  }

  const playing = status === 'playing'
  const lcd =
    status === 'empty'
      ? 'No songs in the playlist yet'
      : status === 'error'
        ? "This video can't play here"
      : status === 'offline'
        ? "Can't reach YouTube right now"
      : status === 'loading'
        ? 'Loading…'
        : status === 'ready' && !title
          ? 'Click anywhere to play'
          : title || 'Ready'
  const track = queue.length ? `${String(at + 1).padStart(2, '0')}/${String(queue.length).padStart(2, '0')}` : '--/--'
  const statusText =
    { loading: 'Loading', ready: 'Ready', playing: 'Playing', paused: 'Paused', stopped: 'Stopped', empty: 'No songs', error: 'Unavailable', offline: 'Offline' }[status]

  // Phones get the narrowest skin at the medium size, docked at the bottom.
  const shownSkin: SkinId = isMobile ? MOBILE_SKIN : skin
  const shownSize: SizeId = isMobile ? 'm' : size
  const scale = SIZES.find(x => x.id === shownSize)!.scale
  const layout = skinLayout(shownSkin)

  const c: Controls = {
    playing,
    hasSongs: queue.length > 0,
    canSkip: queue.length > 1 || queue.some(k => !!songAt(k)?.list),
    muted,
    volume,
    cur: time.cur,
    dur: time.dur,
    lcd,
    track,
    time: fmt(time.cur),
    status: statusText,
    skin: shownSkin,
    size: shownSize,
    onPlayPause: playPause,
    onStop: stop,
    onPrev: prev,
    onNext: next,
    onMute: toggleMute,
    onVolume: changeVolume,
    onSeek: s => {
      player.current?.seekTo(s, true)
      setTime(t => ({ ...t, cur: s }))
    },
    onSkin: chooseSkin,
    onSize: cycleSize,
    onClose,
  }

  return (
    <div
      ref={ref}
      className={`mp pix-skin${isMobile ? ' mobile' : ''}${playing ? ' is-playing' : ''}${muted ? ' is-muted' : ''}`}
      style={{
        ['--s' as string]: scale,
        ['--w' as string]: layout.w,
        ['--h' as string]: layout.h,
        ['--sx' as string]: layout.screen.x,
        ['--sy' as string]: layout.screen.y,
        ['--sw' as string]: layout.screen.w,
        ['--sh' as string]: layout.screen.h,
        ...(pos && !isMobile ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : {}),
      }}
      onPointerDown={startDrag}
      role="region"
      aria-label="Media player"
    >
      <div className="mp-skin">
        {/* The screen is always the first child, so changing skins never
            moves it in the DOM — moving an iframe would reload the video. */}
        <div className="mp-screen" ref={screenRef}>
          {(status === 'empty' || status === 'stopped' || status === 'loading' || status === 'error' || status === 'offline') && (
            <div className="mp-idle" aria-hidden="true">
              {Array.from({ length: 14 }, (_, i) => (
                <span key={i} style={{ animationDelay: `${-i * 0.13}s` }} />
              ))}
            </div>
          )}
        </div>
        <Skin c={c} />
      </div>
    </div>
  )
}
