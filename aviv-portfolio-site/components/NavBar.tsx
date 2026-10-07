'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import PixIcon from '@/components/PixIcon'

// The three system roots (see lib/types.ts ROOT_SLUGS) plus the About leaf.
const TABS = [
  { label: 'Photography', href: '/photography', icon: 'photo-camera' },
  { label: 'Cinema', href: '/cinema', icon: 'movie-camera' },
  { label: 'Commercial', href: '/commercial', icon: 'camcorder' },
  { label: 'About', href: '/about', icon: 'smiley' },
] as const

export default function NavBar() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const activeTab = TABS.find(t => pathname?.startsWith(t.href))

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 70)
      if (window.scrollY <= 70) setOpen(false)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // The secret 90s page is its own world — no nav.
  if (pathname?.startsWith('/secret')) return null

  return (
    <>
      {/* ── Full header — scrolls with page ─────────── */}
      <header
        className="w-full metal"
      >
        {/*
          Engraved mark, top right — cut into the metal rather than sitting on it.
          Light reads as coming from above, so an incised shape is dark along its
          upper wall and catches light along its lower wall. (The previous version
          had these the other way round, which is the signature of a raised
          emboss — hence it floated instead of biting in.)
          brightness(0) flattens the art to a solid silhouette first, so the
          effect doesn't depend on the source PNG's own colour.
        */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            /* Centred on the full banner height, not the name strip: the tab
               row stops well short of the right edge, so there is clear metal
               here and the mark can breathe without the tabs painting over it. */
            top: '50%',
            right: 26,
            width: 92,
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            opacity: 0.9,
          }}
        >
          {/* upper wall in shadow — the deep edge of the groove */}
          <img
            src="/crispy-mark.png"
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: 'auto',
              filter: 'brightness(0) blur(0.6px)',
              transform: 'translate(-1.3px, -2.1px)',
              mixBlendMode: 'multiply',
              opacity: 0.45,
            }}
          />
          {/* lower wall catching the light — bright specular lip */}
          <img
            src="/crispy-mark.png"
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: 'auto',
              filter: 'brightness(0) invert(1) blur(0.55px)',
              transform: 'translate(1.3px, 2.1px)',
              mixBlendMode: 'screen',
              opacity: 0.6,
            }}
          />
          {/* ambient occlusion pooling in the recess */}
          <img
            src="/crispy-mark.png"
            alt=""
            style={{
              position: 'relative',
              width: '100%',
              height: 'auto',
              filter: 'brightness(0) blur(1.3px)',
              mixBlendMode: 'multiply',
              opacity: 0.16,
            }}
          />
        </div>

        {/* Name strip */}
        <div className="px-6 pt-4 pb-1">
          <Link
            href="/"
            style={{ color: '#1a1a1a', textDecoration: 'none' }}
            className="hover:opacity-80 transition-opacity"
            aria-label="CrispyIsland — home"
          >
            <img src="/brand/crispy-island.png" alt="CrispyIsland" className="brand-banner" draggable={false} />
          </Link>
        </div>

        {/* Tab bar */}
        <div className="px-4 flex items-end gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`nav-tab${pathname?.startsWith(tab.href) ? ' active' : ''}`}
            >
              <PixIcon name={tab.icon} size={14} className="nav-tab-icon" />
              {tab.label}
            </Link>
          ))}
        </div>
      </header>

      {/* ── Compact sticky nav — appears on scroll ─── */}
      <div
        ref={dropdownRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transform: scrolled ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.25s ease',
        }}
        className="metal metal-compact"
      >
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#1a1a1a',
          }}
        >
          <img src="/brand/crispy-island.png" alt="CrispyIsland" className="brand-banner small" draggable={false} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#333' }}>
            {activeTab && <span>{activeTab.label}</span>}
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="currentColor"
              style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <path d="M6 8L1 3h10z" />
            </svg>
          </span>
        </button>

        {open && (
          <div
            style={{
              background: 'linear-gradient(to bottom, #c8c8c8, #b0b0b0)',
              borderTop: '1px solid #aaa',
            }}
          >
            {TABS.map(tab => (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'block',
                  padding: '10px 24px',
                  fontSize: 13,
                  fontWeight: pathname?.startsWith(tab.href) ? 600 : 400,
                  color: pathname?.startsWith(tab.href) ? '#000' : '#333',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(0,0,0,0.08)',
                  background: pathname?.startsWith(tab.href) ? 'rgba(255,255,255,0.25)' : 'none',
                  transition: 'background 0.1s',
                }}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
