'use client'

import { useEffect, useState } from 'react'
import Guestbook from './Guestbook'
import { PIRATE_ART } from '@/data/pirate'
import { ARCHIVE, ART, CASTLE, CURSORS, DECOR, GIF, GIF_COUNT, PAGE, THEME, TILE, WORKS } from '@/data/secret'

/** Small seeded random, so the scatter is the same on server and client. */
function scatter(n: number) {
  let seed = 1404
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  return Array.from({ length: n }, (_, i) => ({
    src: DECOR[i % DECOR.length],
    left: rnd() * 94,
    top: rnd() * 96,
    size: 34 + Math.round(rnd() * 3) * 18,
    spin: rnd() < 0.25,
    bounce: rnd() < 0.35,
    delay: -rnd() * 4,
  }))
}
const SPOTS = scatter(GIF_COUNT)
const COUNT_KEY = 'secret:visits'
const THEME_KEY = 'secret:theme'

/** A section heading in the old style, flanked by two of Aviv's drawings. */
function H2({ children, icon }: { children: React.ReactNode; icon: string }) {
  return (
    <h2 className="s90-h2">
      <img src={icon} alt="" className="s90-h2-icon" /> {children} <img src={icon} alt="" className="s90-h2-icon flip" />
    </h2>
  )
}

/**
 * Crispy's Dungeon Layer — the secret 90s homepage. Deliberately old: tiled
 * GIF wallpaper, Aviv's doodles scattered everywhere, a marquee, a rainbow
 * title, beveled tables, a hit counter and a custom cursor. Content lives in
 * data/secret.ts.
 */
export default function SecretPage() {
  const [visits, setVisits] = useState<number | null>(null)
  const [theme, setTheme] = useState<'castle' | 'classic'>(THEME)
  const castle = theme === 'castle'
  useEffect(() => {
    try {
      const t = localStorage.getItem(THEME_KEY)
      if (t === 'castle' || t === 'classic') setTheme(t)
    } catch {}
  }, [])
  const flip = () => {
    const next = castle ? 'classic' : 'castle'
    setTheme(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {}
  }
  const icon = castle ? CASTLE.doorIcon : ART.heart

  useEffect(() => {
    try {
      const n = Number(localStorage.getItem(COUNT_KEY) || 0) + 1
      localStorage.setItem(COUNT_KEY, String(n))
      setVisits(n)
    } catch {
      setVisits(1)
    }
  }, [])

  return (
    <div
      className={`s90${castle ? ' castle' : ''}`}
      style={{
        ['--castle-bg' as string]: `url(${CASTLE.background})`,
        cursor: CURSORS.normal,
        ['--cur-link' as string]: CURSORS.link,
        ['--cur-text' as string]: CURSORS.text,
        ['--cur-help' as string]: CURSORS.help,
        ['--cur-busy' as string]: CURSORS.busy,
        ['--cur-no' as string]: CURSORS.unavailable,
        ['--gif' as string]: `url(${GIF})`,
        ['--tile' as string]: `${TILE}px`,
        ['--bullet' as string]: `url(${castle ? CASTLE.doorwayIcon : ART.heart})`,
      }}
    >
      {/* Pixel blackletter for the castle-look title (falls back to a serif). */}
      {castle && <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jacquard+24&display=swap" precedence="default" />}
      <button type="button" className="s90-skin" onClick={flip} title="Change the page's look">
        {castle ? '☺ classic look' : '⚔ castle look'}
      </button>
      {SPOTS.length > 0 && (
      <div className="s90-gifs" aria-hidden="true">
        {SPOTS.map((s, i) => (
          <img
            key={i}
            src={s.src}
            alt=""
            className={s.spin ? 's90-spin' : s.bounce ? 's90-bounce' : ''}
            style={{ left: `${s.left}%`, top: `${s.top}%`, height: s.size, animationDelay: `${s.delay}s` }}
          />
        ))}
      </div>
      )}

      <div className="s90-main">
        {castle ? (
          <div className="s90-gate">
            <img src={CASTLE.door} alt="A dungeon door between two gargoyles" className="s90-gate-door" />
            <img src={ART.logo} alt="Crispy" className="s90-gate-logo" />
          </div>
        ) : (
          <div className="s90-logo">
            <img src={ART.crystal} alt="" className="s90-bounce" />
            <img src={ART.logo} alt="Crispy" className="s90-logo-bubble" />
            <img src={ART.crystal} alt="" className="s90-bounce" style={{ animationDelay: '-0.6s' }} />
          </div>
        )}

        {castle ? (
          // castle look: one static line of pixel blackletter
          <h1 className="s90-title s90-title-castle">{PAGE.title}</h1>
        ) : (
          <h1 className="s90-title">
            {PAGE.title.split('').map((ch, i) => (
              <span key={i} style={{ animationDelay: `${i * -0.08}s` }}>
                {ch === ' ' ? '\u00a0' : ch}
              </span>
            ))}
          </h1>
        )}

        <div className="s90-marquee" aria-label={PAGE.marquee}>
          <span>{PAGE.marquee}</span>
        </div>

        {castle && (
          <nav className="s90-tabs" aria-label="Dungeon menu">
            {[
              { href: '#works', img: CASTLE.sword, label: 'Works' },
              { href: '#archive', img: CASTLE.weaponFrame, label: 'Archive' },
              { href: '#guestbook', img: CASTLE.chest, label: 'Guestbook' },
              { href: '#deeper', img: CASTLE.tunnel, label: 'Go deeper' },
            ].map(t => (
              <a key={t.href} href={t.href} className="s90-tab">
                <img src={t.img} alt="" />
                <span>{t.label}</span>
              </a>
            ))}
          </nav>
        )}

        <hr className="s90-hr" />

        <table className="s90-hello">
          <tbody>
            <tr>
              <td className="s90-face">
                <img src={castle ? CASTLE.wizard : ART.faceLeft} alt="" />
              </td>
              <td>
                <p className="s90-intro">
                  <span className="s90-blink">NEW!</span> {PAGE.intro}
                </p>
                <div className="s90-construction">
                  <span>UNDER CONSTRUCTION</span>
                </div>
              </td>
              <td className="s90-face">
                <img src={castle ? CASTLE.helmet : ART.faceRight} alt="" />
              </td>
            </tr>
          </tbody>
        </table>

        <span id="works" className="s90-anchor" />
        <H2 icon={icon}>CRISPY WORKS</H2>
        <table className="s90-grid">
          <tbody>
            {Array.from({ length: Math.ceil(WORKS.length / 3) }, (_, r) => (
              <tr key={r}>
                {WORKS.slice(r * 3, r * 3 + 3).map((w, i) => {
                  const pic = w.src ? (
                    <img src={w.src} alt={w.title} />
                  ) : (
                    <span className="s90-soon">
                      <img src={ART.smileyWhite} alt="" />
                      coming soon
                    </span>
                  )
                  return (
                    <td key={i}>
                      {w.href ? (
                        <a href={w.href} target="_blank" rel="noopener">
                          {pic}
                        </a>
                      ) : (
                        pic
                      )}
                      <div className="s90-cap">{w.title}</div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="s90-hr" />

        <span id="archive" className="s90-anchor" />
        <H2 icon={castle ? CASTLE.doorIcon : ART.crystal}>THE ARCHIVE</H2>
        {ARCHIVE.map(group => (
          <div key={group.heading} className="s90-group">
            <h3>
              <img src={ART.smileyWhite} alt="" /> {group.heading}
            </h3>
            <ul>
              {group.items.map((it, i) => {
                const external = it.href.startsWith('http') || it.href.startsWith('/secret/')
                return (
                  <li key={i} className={it.thumb ? 'has-thumb' : ''}>
                    {it.thumb && (
                      <a href={it.href} target="_blank" rel="noopener" className="s90-thumb">
                        <img src={it.thumb} alt="" />
                      </a>
                    )}
                    <span>
                      <a href={it.href} target={external ? '_blank' : undefined} rel="noopener">
                        {it.label}
                      </a>
                      {it.note && <em> — {it.note}</em>}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        <hr className="s90-hr" />

        <span id="guestbook" className="s90-anchor" />
        <H2 icon={icon}>GUESTBOOK</H2>
        <Guestbook icon={ART.smileyWhite} />

        <hr className="s90-hr" />

        {castle && (
          <div className="s90-treasure" aria-hidden="true">
            <img src={CASTLE.knight} alt="" className="s90-knight" />
            <img src={CASTLE.chestPearls} alt="" className="s90-chest" />
          </div>
        )}

        <div className="s90-counter">
          <img src={castle ? CASTLE.chest : ART.heart} alt="" height={34} />
          You have visited the dungeon
          <span className="s90-digits">{String(visits ?? 0).padStart(6, '0')}</span>
          times
          <img src={castle ? CASTLE.chest : ART.heart} alt="" height={34} />
        </div>

        <span id="deeper" className="s90-anchor" />
        <a href="/secret/pirate" className="s90-hatch" title="???">
          <img src={castle ? CASTLE.archway : PIRATE_ART.ship} alt="" />
          ↓ go deeper: the secret pirate port ↓
        </a>

        <div className="s90-buttons">
          <a href="/" className="s90-btn">
            &lt;&lt; Back to the desktop
          </a>
        </div>

        {castle && <img src={CASTLE.knightSmall} alt="" className="s90-walker" aria-hidden="true" />}
        <p className="s90-foot">
          <img src={ART.smileyWhite} alt="" height={14} /> Best viewed at 800x600 · {PAGE.updated} · © Crispy
        </p>
      </div>
    </div>
  )
}
