'use client'

import { itemById } from '@/lib/tree-query'
import { getEmbedUrl } from '@/lib/video'
import PixIcon from '@/components/PixIcon'
import Window from '../Window'
import type { FrameProps } from './frame'

/** A film: player (or poster), stills strip, credits. */
export default function FilmWindow({ frame, itemId }: { frame: FrameProps; itemId: string }) {
  const { api } = frame
  const item = itemById(api.tree, itemId)
  const film = item?.kind === 'film' ? item : null

  if (!film) {
    return (
      <Window {...frame} title="Missing film" size={{ w: 420, h: 220 }} status="">
        <p className="win-empty">This film has moved or been removed.</p>
      </Window>
    )
  }

  const embed = film.videoUrl ? getEmbedUrl(film.videoUrl) : null
  const stills = film.stills ?? []
  const credits = [
    { label: 'Year', value: film.year ? String(film.year) : '' },
    { label: 'Duration', value: film.duration },
    { label: 'Director', value: film.director },
    { label: 'Producer', value: film.producer },
    { label: 'Cinematographer', value: film.cinematographer },
    { label: 'Editor', value: film.editor },
    { label: 'Production Company', value: film.productionCompany },
  ].filter(c => c.value)

  return (
    <Window
      {...frame}
      title={film.title || 'Untitled film'}
      size={{ w: 1000, h: 620 }}
      minSize={{ w: 360, h: 280 }}
      dark
      status={[film.year, film.duration].filter(Boolean).join(' · ') || ' '}
    >
      <div className="film-layout">
        <div className="film-main">
          <div className="film-screen">
            {embed ? (
              <iframe
                src={embed.embedSrc}
                title={film.title}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : film.posterSrc ? (
              <img src={film.posterSrc} alt={film.title} draggable={false} />
            ) : (
              <div className="film-novideo">
                <PixIcon name="movie-camera" size={56} />
                No video yet
              </div>
            )}
          </div>

          {stills.length > 0 && (
            <div className="film-stills">
              {stills.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    api.quickLook(
                      stills.map(st => ({ id: st.id, src: st.src, alt: film.title, caption: st.caption })),
                      i,
                      film.title
                    )
                  }
                >
                  <img src={s.src} alt={s.caption ?? ''} />
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="film-credits">
          <h2>{film.title}</h2>
          {credits.map(c => (
            <div key={c.label} className="film-credit">
              <div className="film-credit-label">{c.label}</div>
              <div className="film-credit-value">{c.value}</div>
            </div>
          ))}
          {film.awards.length > 0 && (
            <div className="film-credit">
              <div className="film-credit-label">Awards</div>
              <ul>
                {film.awards.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {film.caption && <p className="film-desc">{film.caption}</p>}
          <button type="button" className="win-btn ghost" onClick={() => api.copyLink(`/p/${film.id}`)}>
            <PixIcon name="link" size={12} /> Copy Link
          </button>
        </aside>
      </div>
    </Window>
  )
}
