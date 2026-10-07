'use client'

import { useEffect, useState } from 'react'
import Guestbook from './Guestbook'
import { ARCHIVE, ART, CURSORS, DECOR, GIF, GIF_COUNT, PAGE, TILE, WORKS } from '@/data/secret'

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
      className="s90"
      style={{
        cursor: CURSORS.normal,
        ['--cur-link' as string]: CURSORS.link,
        ['--cur-text' as string]: CURSORS.text,
        ['--cur-help' as string]: CURSORS.help,
        ['--cur-busy' as string]: CURSORS.busy,
        ['--cur-no' as string]: CURSORS.unavailable,
        ['--gif' as string]: `url(${GIF})`,
        ['--tile' as string]: `${TILE}px`,
        ['--bullet' as string]: `url(${ART.heart})`,
      }}
    >
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
        <div className="s90-logo">
          <img src={ART.crystal} alt="" className="s90-bounce" />
          <img src={ART.logo} alt="Crispy" className="s90-logo-bubble" />
          <img src={ART.crystal} alt="" className="s90-bounce" style={{ animationDelay: '-0.6s' }} />
        </div>

        <h1 className="s90-title">
          {PAGE.title.split('').map((ch, i) => (
            <span key={i} style={{ animationDelay: `${i * -0.08}s` }}>
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </h1>

        <div className="s90-marquee" aria-label={PAGE.marquee}>
          <span>{PAGE.marquee}</span>
        </div>

        <hr className="s90-hr" />

        <table className="s90-hello">
          <tbody>
            <tr>
              <td className="s90-face">
                <img src={ART.faceLeft} alt="" />
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
                <img src={ART.faceRight} alt="" />
              </td>
            </tr>
          </tbody>
        </table>

        <H2 icon={ART.heart}>CRISPY WORKS</H2>
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

        <H2 icon={ART.crystal}>THE ARCHIVE</H2>
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

        <H2 icon={ART.heart}>GUESTBOOK</H2>
        <Guestbook icon={ART.smileyWhite} />

        <hr className="s90-hr" />

        <div className="s90-counter">
          <img src={ART.heart} alt="" height={34} />
          You have visited the dungeon
          <span className="s90-digits">{String(visits ?? 0).padStart(6, '0')}</span>
          times
          <img src={ART.heart} alt="" height={34} />
        </div>

        <div className="s90-buttons">
          <a href="/" className="s90-btn">
            &lt;&lt; Back to the desktop
          </a>
        </div>

        <p className="s90-foot">
          <img src={ART.smileyWhite} alt="" height={14} /> Best viewed at 800x600 · {PAGE.updated} · © Crispy
        </p>
      </div>
    </div>
  )
}
