'use client'

import { useEffect, useState } from 'react'
import { TAPES } from '@/data/tv'
import { getEmbedUrl } from '@/lib/video'
import Window from '../Window'
import type { FrameProps } from './frame'

/** Tells the desktop music player to pause while a tape plays. */
export const TV_PLAY_EVENT = 'crispy:tv-play'
/** …and that the tape stopped. */
export const TV_STOP_EVENT = 'crispy:tv-stop'

/**
 * A 90s CRT TV, drawn in the same glossy blue as the Crispy Player, with a
 * shelf of VHS tapes underneath. Click a tape to put it in; CH ▲▼ flip
 * through them; the power button switches the set off.
 */
export default function TvWindow({ frame }: { frame: FrameProps }) {
  const [at, setAt] = useState(0)
  const [on, setOn] = useState(true)
  const [loading, setLoading] = useState(true)
  const tape = TAPES[at]
  const embed = tape?.video ? getEmbedUrl(tape.video) : null

  // A moment of static whenever the tape changes, like a real deck.
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(t)
  }, [at, on])

  useEffect(() => {
    if (!(on && embed && !loading)) return
    window.dispatchEvent(new Event(TV_PLAY_EVENT))
    // the tape stopped (new tape, power off, TV closed)
    return () => {
      window.dispatchEvent(new Event(TV_STOP_EVENT))
    }
  }, [on, embed, loading])

  const ch = (d: number) => setAt(i => (i + d + TAPES.length) % TAPES.length)
  const src = embed ? `${embed.embedSrc}${embed.embedSrc.includes('?') ? '&' : '?'}autoplay=1&rel=0&modestbranding=1&playsinline=1` : ''

  return (
    <Window {...frame} title="TV" mini={{ w: 280, h: 280, label: 'TV' }} size={{ w: 640, h: 720 }} minSize={{ w: 320, h: 420 }} status={tape ? `CH ${String(at + 1).padStart(2, '0')} · ${tape.title}` : ' '}>
      <div className="tv-room">
        <div className={`tv${on ? '' : ' off'}`}>
          <div className="tv-screen">
            {on && (
              <>
                {embed && !loading ? (
                  <iframe key={tape.id} src={src} title={tape.title} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
                ) : tape?.art && !loading ? (
                  <img className="tv-art" src={tape.art} alt={tape.title} />
                ) : (
                  <div className="tv-static" aria-hidden="true" />
                )}
                <div className="tv-osd">
                  <span>CH {String(at + 1).padStart(2, '0')}</span>
                  {!embed && !loading && !tape?.art && <strong>NO SIGNAL</strong>}
                  {embed && loading && <strong>▶ PLAY</strong>}
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
              <button type="button" className={`tv-power${on ? ' lit' : ''}`} onClick={() => setOn(o => !o)} aria-label={on ? 'Turn TV off' : 'Turn TV on'} title="Power">
                ⏻
              </button>
            </div>
          </div>
        </div>

        <div className="vhs-shelf" role="listbox" aria-label="VHS tapes">
          {TAPES.map((t, i) => (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={i === at}
              className={`vhs${i === at ? ' in' : ''}${t.video || t.art ? '' : ' blank'}${t.art ? ' art' : ''}`}
              style={{ ['--tape' as string]: t.color }}
              onClick={() => {
                setAt(i)
                setOn(true)
              }}
              title={t.video || t.art ? t.title : `${t.title} (no video yet)`}
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
