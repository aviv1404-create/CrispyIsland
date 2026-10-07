'use client'

import { rotClass } from '@/lib/types'
import { useEffect, useCallback, useRef, useState } from 'react'

export interface LightboxPhoto {
  id: string
  src: string
  alt: string
  title?: string
  caption?: string
  rotate?: number
}

interface LightboxProps {
  photos: LightboxPhoto[]
  index: number
  /** Shown in the title bar: "Portraits — 7 of 24" */
  folderName?: string
  /** Film stills have no /p/[id] of their own, so they hide Share. */
  shareable?: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

/** V4 photo view — dark backdrop, arrows, caption, Share. M3 adds swipe. */
export default function Lightbox({
  photos,
  index,
  folderName,
  shareable = true,
  onClose,
  onPrev,
  onNext,
}: LightboxProps) {
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const photo = photos[index]

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (shareOpen) setShareOpen(false)
        else onClose()
      }
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    },
    [onClose, onPrev, onNext, shareOpen]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [handleKey])

  // Close the share dialog when moving to another photo. Adjusting state during
  // render (rather than in an effect) avoids a second render pass.
  const [shownIndex, setShownIndex] = useState(index)
  if (shownIndex !== index) {
    setShownIndex(index)
    setShareOpen(false)
    setCopied(false)
  }

  // ── Swipe: left/right moves within the folder, down closes (M3) ──
  const touch = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current.x
    const dy = t.clientY - touch.current.y
    touch.current = null

    const THRESHOLD = 50
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > THRESHOLD) onPrev()
      else if (dx < -THRESHOLD) onNext()
    } else if (dy > THRESHOLD) {
      onClose()
    }
  }

  const shareUrl =
    typeof window !== 'undefined' && photo ? `${window.location.origin}/p/${photo.id}` : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  if (!photo) return null

  const label = [photo.title, photo.caption].filter(Boolean).join(' — ')

  return (
    <div
      className="lightbox-overlay"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Title bar — "Portraits — 7 of 24" */}
      <div className="lightbox-titlebar" onClick={e => e.stopPropagation()}>
        {[folderName, `${index + 1} of ${photos.length}`].filter(Boolean).join(' — ')}
      </div>

      <button onClick={onClose} className="lightbox-close" aria-label="Close">
        ×
      </button>

      {photos.length > 1 && (
        <button
          onClick={e => {
            e.stopPropagation()
            onPrev()
          }}
          className="lightbox-arrow left"
          aria-label="Previous photo"
        >
          ‹
        </button>
      )}

      <div className="lightbox-stage" onClick={e => e.stopPropagation()}>
        {photo.src ? (
          <img src={photo.src} alt={photo.alt} className={`lightbox-img ${rotClass(photo)}`} />
        ) : (
          <div className="lightbox-missing">Image coming soon</div>
        )}
      </div>

      {photos.length > 1 && (
        <button
          onClick={e => {
            e.stopPropagation()
            onNext()
          }}
          className="lightbox-arrow right"
          aria-label="Next photo"
        >
          ›
        </button>
      )}

      {/* Caption + Share, sitting on the status bar */}
      <div className="lightbox-bar" onClick={e => e.stopPropagation()}>
        <span className="lightbox-caption">{label}</span>
        {shareable && (
          <button className="win-btn" onClick={() => setShareOpen(true)}>
            Share
          </button>
        )}
      </div>

      {/* V5 — copy link dialog */}
      {shareOpen && (
        <div className="lightbox-share-backdrop" onClick={() => setShareOpen(false)}>
          <div className="win-dialog" onClick={e => e.stopPropagation()}>
            <p className="win-dialog-title">Copy link to this photo</p>
            <input className="win-dialog-field" readOnly value={shareUrl} onFocus={e => e.currentTarget.select()} />
            <p className="win-dialog-note">Anyone with the link can view</p>
            <div className="win-dialog-actions">
              <button className="win-btn" onClick={() => setShareOpen(false)}>
                Cancel
              </button>
              <button className="win-btn primary" onClick={copy}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
