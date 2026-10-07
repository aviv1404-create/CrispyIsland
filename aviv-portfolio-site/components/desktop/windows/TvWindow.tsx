'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { tapesOf, type Tape } from '@/data/tv'
import { getEmbedUrl } from '@/lib/video'
import Window from '../Window'
import type { FrameProps } from './frame'

/** Tells the desktop music player to pause while a tape plays. */
export const TV_PLAY_EVENT = 'crispy:tv-play'
/** …and that the tape stopped. */
export const TV_STOP_EVENT = 'crispy:tv-stop'

const shuffled = (n: number) => {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const playOrder = (t: Tape | undefined) =>
  !t ? [] : t.order === 'shuffle' ? shuffled(t.videos.length) : t.videos.map((_, i) => i)

/**
 * A 90s CRT TV, drawn in the same glossy blue as the Crispy Player, with a
 * shelf of VHS tapes underneath. Each tape is a channel with its own videos
 * (set in /admin → TV): YouTube or Vimeo links, or uploaded video files. A
 * channel plays its videos one after another — in order or shuffled — and
 * loops. CH ▲▼ flip channels, ⏭ skips to the next video, ⏻ switches off.
 */
export default function TvWindow({ frame }: { frame: FrameProps }) {
  const tapes = tapesOf(frame.api.tree)
  const [at, setAt] = useState(0)
  const [on, setOn] = useState(true)
  const [loading, setLoading] = useState(true)
  const tape = tapes[at] as Tape | undefined
  // The play order for the tape in the deck, and where we are in it.
  const [queue, setQueue] = useState<number[]>(() => playOrder(tapes[0]))
  const [pos, setPos] = useState(0)
  const video = tape && queue.length ? tape.videos[queue[pos % queue.length]] : undefined
  const embed = video ? getEmbedUrl(video.url) : null
  const isFile = !!video && !embed
  const playing = on && !!video && !loading
  const isList = !!embed?.playlist
  // What the YouTube player inside reports: its state (1 = playing) and, for
  // a playlist, where it is in the list. Until it says "playing", the screen
  // shows static, so YouTube's loading/pause/end screens never show through.
  const [yt, setYt] = useState<{ state: number; idx?: number; len?: number }>({ state: -1 })
  // If the browser blocked autoplay (or the player never reports in), get the
  // static and the shield out of the way so the viewer can press play.
  const [tapToPlay, setTapToPlay] = useState(false)

  const insert = (i: number) => {
    setAt(i)
    setQueue(playOrder(tapes[i]))
    setPos(0)
    setOn(true)
  }
  const nextVideo = () => {
    if (!tape || !queue.length) return
    if (pos + 1 >= queue.length) {
      // end of the tape: loop (a shuffled tape gets a fresh shuffle)
      setQueue(playOrder(tape))
      setPos(0)
    } else setPos(p => p + 1)
  }
  const nextRef = useRef(nextVideo)
  nextRef.current = nextVideo

  // A moment of static whenever the tape or video changes, like a real deck.
  useEffect(() => {
    setYt({ state: -1 })
    setTapToPlay(false)
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(t)
  }, [at, on, pos, queue])

  useEffect(() => {
    if (!playing) return
    window.dispatchEvent(new Event(TV_PLAY_EVENT))
    // the tape stopped (new tape, power off, TV closed)
    return () => {
      window.dispatchEvent(new Event(TV_STOP_EVENT))
    }
  }, [playing])

  // When a YouTube or Vimeo video ends, move on to the next one.
  const frameRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    if (!playing || !embed) return
    const ifr = frameRef.current
    const hello = () => {
      const w = ifr?.contentWindow
      if (!w) return
      if (embed.provider === 'youtube') w.postMessage(JSON.stringify({ event: 'listening', id: 'tv' }), '*')
      else w.postMessage(JSON.stringify({ method: 'addEventListener', value: 'finish' }), '*')
    }
    const onMsg = (e: MessageEvent) => {
      if (!ifr || e.source !== ifr.contentWindow) return
      let m: {
        event?: string
        info?: { playerState?: number; playlistIndex?: number; playlist?: string[] | null } | number
      } = {}
      try {
        m = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
      } catch {
        return
      }
      if (embed.provider === 'youtube') {
        const info = m.info
        const state =
          m.event === 'onStateChange' && typeof info === 'number'
            ? info
            : m.event === 'infoDelivery' && typeof info === 'object' && typeof info?.playerState === 'number'
              ? info.playerState
              : undefined
        if (state === 1) setTapToPlay(false)
        if (state !== undefined || (typeof info === 'object' && info?.playlistIndex !== undefined)) {
          setYt(prev => ({
            state: state ?? prev.state,
            idx: typeof info === 'object' && typeof info?.playlistIndex === 'number' ? info.playlistIndex : prev.idx,
            len: typeof info === 'object' && Array.isArray(info?.playlist) ? info.playlist.length : prev.len,
          }))
        }
        // A playlist moves on (and loops) by itself; a single video hands
        // over to the next one on this channel.
        if (state === 0 && !embed.playlist) nextRef.current()
        return
      }
      if (m.event === 'finish') nextRef.current()
    }
    window.addEventListener('message', onMsg)
    ifr?.addEventListener('load', hello)
    const t = setInterval(hello, 1500) // keep saying hello until the player answers
    const stuck = setTimeout(() => setTapToPlay(true), 5000)
    return () => {
      clearTimeout(stuck)
      window.removeEventListener('message', onMsg)
      ifr?.removeEventListener('load', hello)
      clearInterval(t)
    }
  }, [playing, embed])

  const ch = (d: number) => insert((at + d + tapes.length) % tapes.length)
  // ⏭ — inside a YouTube playlist, ask the player to skip; otherwise move on
  // to the next video on this channel.
  const skip = () => {
    if (isList && playing) {
      setYt(prev => ({ ...prev, state: 3 }))
      frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'nextVideo', args: [] }), '*')
    } else nextVideo()
  }
  const src = useMemo(() => {
    if (!embed) return ''
    const sep = embed.embedSrc.includes('?') ? '&' : '?'
    return embed.provider === 'youtube'
      ? // No YouTube control bar, captions, annotations, keyboard or fullscreen:
        // the TV's own knobs are the controls.
        `${embed.embedSrc}${sep}autoplay=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0&rel=0&playsinline=1&enablejsapi=1${embed.playlist ? '&loop=1' : ''}`
      : `${embed.embedSrc}${sep}autoplay=1&api=1&player_id=tv`
  }, [embed])
  const count = tape?.videos.length ?? 0
  const where =
    isList && yt.len
      ? ` · ${(yt.idx ?? 0) + 1}/${yt.len}`
      : count > 1
        ? ` · ${(pos % count) + 1}/${count}${tape?.order === 'shuffle' ? ' 🔀' : ''}`
        : ''
  const status = tape ? `CH ${String(at + 1).padStart(2, '0')} · ${tape.title}${where}${video?.title ? ` · ${video.title}` : ''}` : ' '
  const canSkip = count > 1 || isList

  return (
    <Window {...frame} title="TV" mini={{ w: 280, h: 280, label: 'TV' }} size={{ w: 640, h: 720 }} minSize={{ w: 320, h: 420 }} status={status}>
      <div className="tv-room">
        <div className={`tv${on ? '' : ' off'}`}>
          <div className="tv-screen">
            {on && (
              <>
                {playing && embed ? (
                  <>
                    <iframe
                      ref={frameRef}
                      key={`${tape!.id}-${pos}-${video!.id}`}
                      src={src}
                      title={video!.title || tape!.title}
                      allow="autoplay; encrypted-media; picture-in-picture"
                    />
                    {embed.provider === 'youtube' && !(tapToPlay && yt.state !== 1) && (
                      <>
                        {/* Static over the picture until YouTube is actually
                            playing (loading, buffering, between videos). */}
                        {yt.state !== 1 && <div className="tv-static tv-cover" aria-hidden="true" />}
                        {/* Clicks land on the TV, not on YouTube: no pausing
                            into YouTube's suggestion screen. */}
                        <div className="tv-shield" aria-hidden="true" />
                      </>
                    )}
                  </>
                ) : playing && isFile ? (
                  <video
                    key={`${tape!.id}-${pos}-${video!.id}`}
                    className="tv-video"
                    src={video!.url}
                    autoPlay
                    playsInline
                    controls
                    onEnded={() => nextRef.current()}
                  />
                ) : tape?.art && !loading && !video ? (
                  <img className="tv-art" src={tape.art} alt={tape.title} />
                ) : (
                  <div className="tv-static" aria-hidden="true" />
                )}
                <div className="tv-osd">
                  <span>CH {String(at + 1).padStart(2, '0')}</span>
                  {!video && !loading && !tape?.art && <strong>NO SIGNAL</strong>}
                  {video && loading && <strong>▶ PLAY</strong>}
                </div>
              </>
            )}
            <div className="tv-glass" aria-hidden="true" />
          </div>
          <div className="tv-panel">
            <span className="tv-brand">CRISPY·VISION</span>
            <span className="tv-grille" aria-hidden="true" />
            <div className="tv-knobs">
              <button type="button" onClick={() => ch(-1)} aria-label="Channel down" title="CH ▼">▼</button>
              <button type="button" onClick={() => ch(1)} aria-label="Channel up" title="CH ▲">▲</button>
              {canSkip && (
                <button type="button" onClick={skip} aria-label="Next video on this channel" title="Next video">
                  ⏭
                </button>
              )}
              <button type="button" className={`tv-power${on ? ' lit' : ''}`} onClick={() => setOn(o => !o)} aria-label={on ? 'Turn TV off' : 'Turn TV on'} title="Power">
                ⏻
              </button>
            </div>
          </div>
        </div>

        <div className="vhs-shelf" role="listbox" aria-label="VHS tapes">
          {tapes.map((t, i) => (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={i === at}
              className={`vhs${i === at ? ' in' : ''}${t.videos.length || t.art ? '' : ' blank'}${t.art ? ' art' : ''}`}
              style={{ ['--tape' as string]: t.color }}
              onClick={() => insert(i)}
              title={t.videos.length ? `${t.title} · ${t.videos.length} video${t.videos.length > 1 ? 's' : ''}` : t.art ? t.title : `${t.title} (no video yet)`}
            >
              {t.art ? (
                <span className="vhs-label vhs-art">
                  <img src={t.art} alt={t.title} draggable={false} />
                </span>
              ) : (
              <span className="vhs-label">
                <strong>{t.title}</strong>
                {t.sub && <small>{t.sub}</small>}
              </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </Window>
  )
}
