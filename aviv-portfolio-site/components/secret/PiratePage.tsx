'use client'

import { CHESTS, PIRATE_ART as A, PIRATE_CURSORS as CURSORS, PIRATE_PAGE as P, SHIPYARD } from '@/data/pirate'

/**
 * Crispy's Secret Pirate Port — the second secret layer, under the dungeon.
 * A night harbour: animated sea, a ship sailing across, a treasure-map
 * parchment page and a big COMING SOON stamp. Content lives in data/pirate.ts.
 */
export default function PiratePage() {
  return (
    <div
      className="pp"
      style={{
        cursor: CURSORS.normal,
        ['--cur-link' as string]: CURSORS.link,
        ['--cur-text' as string]: CURSORS.text,
        ['--cur-help' as string]: CURSORS.help,
        ['--cur-busy' as string]: CURSORS.busy,
        ['--cur-no' as string]: CURSORS.unavailable,
        ['--bones' as string]: `url(${A.skullBones})`,
      }}
    >
      <div className="pp-sky">
        <div className="pp-eyes-box" aria-hidden="true">
          <img src={A.eyes} alt="" className="pp-eyes" />
        </div>
        <small>somethin’ be watchin’ ye…</small>
      </div>

      <main className="pp-map">
        <div className="pp-head">
          <img src={A.skullHat} alt="" className="pp-rock" />
          <h1 className="pp-title">
            {P.title.split(' ').map((word, w) => (
              <span key={w} className="pp-word">
                {word.split('').map((ch, i) => (
                  <span key={i} style={{ animationDelay: `${(w * 6 + i) * -0.09}s` }}>
                    {ch}
                  </span>
                ))}
              </span>
            ))}
          </h1>
          <img src={A.skullHat} alt="" className="pp-rock flip" style={{ animationDelay: '-1s' }} />
        </div>

        <div className="pp-marquee" aria-label={P.marquee}>
          <span>{P.marquee}</span>
        </div>

        <div className="pp-hello">
          <figure className="pp-pirate">
            <img src={A.pirate} alt="A pirate" />
            <figcaption className="pp-bubble">{P.says}</figcaption>
          </figure>
          <p className="pp-intro">{P.intro}</p>
          <img src={A.skullBones} alt="" className="pp-jolly" />
        </div>

        {P.comingSoon && (
          <div className="pp-soon" role="note">
            <img src={A.skullSwords} alt="" />
            <strong>{P.comingSoon}</strong>
            <img src={A.skullSwords} alt="" />
          </div>
        )}

        <h2 className="pp-h2">
          <span aria-hidden="true">⚓</span> The Shipyard <span aria-hidden="true">⚓</span>
        </h2>
        <p className="pp-sub">Real LEGO pirate ships — click one to see it on BrickLink.</p>
        <table className="pp-ships">
          <tbody>
            {SHIPYARD.map(s => (
              <tr key={s.href}>
                <td className="pp-ship-icon">
                  <img src={A.skullBones} alt="" />
                </td>
                <td>
                  <a href={s.href} target="_blank" rel="noopener">
                    {s.label}
                  </a>
                </td>
                <td className="pp-ship-note">{s.note}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="pp-h2">
          <span aria-hidden="true">☠</span> Locked Chests <span aria-hidden="true">☠</span>
        </h2>
        <div className="pp-chests">
          {CHESTS.map(c => (
            <div key={c.title} className="pp-chest" aria-disabled="true" title="Locked — coming soon">
              <span className="pp-lock" aria-hidden="true">🔒</span>
              <strong>{c.title}</strong>
              <small>locked</small>
            </div>
          ))}
        </div>

        <div className="pp-nav">
          <a href="/secret" className="pp-btn">
            ↑ Back up to the Dungeon
          </a>
          <a href="/" className="pp-btn">
            Abandon ship (desktop)
          </a>
        </div>
        <p className="pp-foot">X marks the spot · © Crispy · no landlubbers</p>
      </main>

      <div className="pp-banner">
        <img src={A.banner} alt="X marks the spot!" width={468} height={60} />
        <small>advertisement</small>
      </div>

      <div className="pp-sea" aria-hidden="true">
        <img src={A.ship} alt="" className="pp-ship" />
        <span className="pp-wave w1" />
        <span className="pp-wave w2" />
        <span className="pp-wave w3" />
      </div>
    </div>
  )
}
