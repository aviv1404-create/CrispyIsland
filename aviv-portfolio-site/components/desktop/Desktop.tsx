'use client'

import TvWindow from './windows/TvWindow'
import BootScreen from './BootScreen'
import EventsWindow from './windows/EventsWindow'
import GameWindow from './windows/GameWindow'
import { GAMES } from '@/data/games'
import SecretBubble from './SecretBubble'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Lightbox from '@/components/Lightbox'
import { DESKTOP_ART } from '@/data/desktop'
import MediaPlayer from './MediaPlayer'
import { rootFolders } from '@/lib/tree-query'
import type { Tree } from '@/lib/types'
import { ContextMenuProvider } from './ContextMenu'
import FloatField, { type FloatEntry } from './FloatField'
import { folderEntry } from './entries'
import { DeskIcon } from './icons'
import PixIcon from '@/components/PixIcon'
import { SOCIALS } from '@/data/socials'
import { hrefFor, specsForPath } from './routes'
import { specKey, type DesktopApi, type OpenOptions, type QuickLookPhoto, type Win, type WinSpec } from './types'
import AboutWindow from './windows/AboutWindow'
import FilmWindow from './windows/FilmWindow'
import FolderWindow from './windows/FolderWindow'
import InfoWindow from './windows/InfoWindow'
import PhotoWindow from './windows/PhotoWindow'
import SearchWindow from './windows/SearchWindow'
import SocialWindow from './windows/SocialWindow'
import type { FrameProps } from './windows/frame'

interface DesktopProps {
  tree: Tree
  isAdmin: boolean
  children: React.ReactNode
}

// ── Small screens get one full-screen window at a time ──
const MOBILE_QUERY = '(max-width: 700px)'
function useIsMobile() {
  return useSyncExternalStore(
    cb => {
      const mq = window.matchMedia(MOBILE_QUERY)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  )
}

// Back/Forward detection. Registered in the capture phase at module load so it
// runs before Next's own popstate handling re-renders anything.
let popPending = false
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    popPending = true
  }, true)
}

let nextWinId = 0
const newId = () => `w${++nextWinId}`

/**
 * The site is a desktop. Folders, photos, films and pages open as windows you
 * can drag, stack, resize and close; icons float and can be arranged anywhere.
 *
 * The address bar always names the front window, so every view still has a
 * shareable URL and the routes (/photography, /p/[id], /about, /search) still
 * work when visited directly — they just open the right window(s) on load.
 */
export default function Desktop({ tree, isAdmin, children }: DesktopProps) {
  const pathname = usePathname() ?? '/'
  // /admin and the secret 90s page draw their own full-screen pages.
  const passthrough = pathname.startsWith('/admin') || pathname.startsWith('/secret')
  const isMobile = useIsMobile()

  const zTop = useRef(0)
  const cascade = useRef(0)

  const makeWin = useCallback((spec: WinSpec): Win => {
    return { id: newId(), spec, z: ++zTop.current, geom: null, cascade: cascade.current++, maximized: false, back: [] }
  }, [])

  const [wins, setWins] = useState<Win[]>(() =>
    passthrough ? [] : specsForPath(tree, pathname).map(makeWin)
  )
  const [look, setLook] = useState<{ photos: QuickLookPhoto[]; index: number; title?: string } | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [playerOpen, setPlayerOpen] = useState(true)

  // Route output (only the 404 alert renders anything) belongs to the URL it
  // was rendered for. Opening a window changes the URL without a server round
  // trip, so hide stale route output once the address bar moves on.
  const [childrenPath, setChildrenPath] = useState(pathname)
  const [seenChildren, setSeenChildren] = useState(children)
  if (seenChildren !== children) {
    setSeenChildren(children)
    setChildrenPath(pathname)
  }

  const live = wins.filter(w => !w.closing)
  const front = live.reduce<Win | null>((a, w) => (!a || w.z > a.z ? w : a), null)

  // ── URL ⇄ windows ───────────────────────────────────
  const lastSynced = useRef<string>(pathname)

  const syncUrl = useCallback(
    (spec: WinSpec | null, mode: 'push' | 'replace') => {
      const href = spec ? hrefFor(tree, spec) : '/'
      if (href === null) return
      const current = window.location.pathname + window.location.search
      if (href === current) return
      lastSynced.current = href.split('?')[0]
      // Native history calls stay in sync with Next's router (usePathname),
      // without a server round trip for every window you open.
      window.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', href)
    },
    [tree]
  )

  // ── Window manager ──────────────────────────────────
  // Window state is mirrored in a ref so each operation can compute the next
  // state synchronously and then update the URL outside of React's render
  // phase (history calls notify Next's router, which must not happen mid-render).
  const winsRef = useRef(wins)
  const commit = useCallback((next: Win[]) => {
    winsRef.current = next
    setWins(next)
  }, [])
  const topOf = (ws: Win[]) =>
    ws.filter(w => !w.closing).reduce<Win | null>((a, w) => (!a || w.z > a.z ? w : a), null)

  const focus = useCallback(
    (id: string) => {
      const ws = winsRef.current
      const w = ws.find(x => x.id === id)
      if (!w || w.closing || w.z === zTop.current) return
      commit(ws.map(x => (x.id === id ? { ...x, z: ++zTop.current } : x)))
      syncUrl(w.spec, 'replace')
    },
    [commit, syncUrl]
  )

  const close = useCallback(
    (id: string) => {
      const ws = winsRef.current
      const next = ws.map(w => (w.id === id ? { ...w, closing: true } : w))
      commit(next)
      const top = topOf(next)
      syncUrl(top ? top.spec : null, 'replace')
      // Let the close animation play, then drop it.
      setTimeout(() => commit(winsRef.current.filter(w => w.id !== id)), 160)
    },
    [commit, syncUrl]
  )

  const open = useCallback(
    (spec: WinSpec, opts: OpenOptions = {}) => {
      const ws = winsRef.current
      const host = opts.inWindow ? ws.find(w => w.id === opts.inWindow && !w.closing) : undefined
      const key = specKey(spec)
      const existing = !opts.newWindow && ws.find(w => !w.closing && specKey(w.spec) === key)
      if (host) {
        commit(ws.map(w => (w.id === host.id ? { ...w, spec, back: [...w.back, w.spec], z: ++zTop.current } : w)))
      } else if (existing) {
        commit(ws.map(w => (w.id === existing.id ? { ...w, spec, z: ++zTop.current } : w)))
      } else {
        commit([...ws, makeWin(spec)])
      }
      syncUrl(spec, 'push')
    },
    [commit, makeWin, syncUrl]
  )

  const replaceSpec = useCallback(
    (id: string, spec: WinSpec) => {
      commit(winsRef.current.map(w => (w.id === id ? { ...w, spec } : w)))
      syncUrl(spec, 'replace')
    },
    [commit, syncUrl]
  )

  const goBack = useCallback(
    (id: string) => {
      const w = winsRef.current.find(x => x.id === id)
      if (!w || !w.back.length) return
      const prev = w.back[w.back.length - 1]
      commit(winsRef.current.map(x => (x.id === id ? { ...x, spec: prev, back: x.back.slice(0, -1) } : x)))
      syncUrl(prev, 'replace')
    },
    [commit, syncUrl]
  )

  const setGeom = useCallback(
    (id: string, patch: Partial<Win>) => commit(winsRef.current.map(x => (x.id === id ? { ...x, ...patch } : x))),
    [commit]
  )

  // Pick up the search query, which the server-rendered pass couldn't see.
  useEffect(() => {
    if (passthrough) return
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) commit(winsRef.current.map(w => (w.spec.kind === 'search' ? { ...w, spec: { kind: 'search', q } } : w)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Someone else changed the URL — a tab in the nav bar, or Back/Forward.
  // Handled a tick later: depending on listener order, the router can
  // re-render before our popstate listener has flagged the change as Back.
  useEffect(() => {
    if (passthrough) return
    const t = setTimeout(() => {
      const wasPop = popPending
      popPending = false
      if (pathname === lastSynced.current) return
      lastSynced.current = pathname
      const specs = specsForPath(tree, pathname, window.location.search)

      let next = winsRef.current
      if (wasPop) {
        // Back closes the window you just opened, like leaving a page would.
        // If that window was navigated in place, step it back instead.
        const top = topOf(next)
        const prev = top?.back[top.back.length - 1]
        if (top && prev && hrefFor(tree, prev) === pathname) {
          next = next.map(w => (w.id === top.id ? { ...w, spec: prev, back: w.back.slice(0, -1) } : w))
        } else if (top && hrefFor(tree, top.spec)?.split('?')[0] !== pathname) {
          next = next.filter(w => w.id !== top.id)
        }
      }
      for (const spec of specs) {
        const key = specKey(spec)
        const existing = next.find(w => !w.closing && specKey(w.spec) === key)
        if (existing) {
          next = next.map(w => (w.id === existing.id ? { ...w, spec, z: ++zTop.current } : w))
        } else {
          next = [...next, makeWin(spec)]
        }
      }
      commit(next)
    }, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, passthrough, tree, makeWin])

  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const toast = useCallback((message: string) => {
    setToastMsg(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(null), 1800)
  }, [])

  const copyLink = useCallback(
    async (href: string) => {
      const url = `${window.location.origin}${href}`
      try {
        await navigator.clipboard.writeText(url)
        toast('Link copied')
      } catch {
        toast(url)
      }
    },
    [toast]
  )

  const quickLook = useCallback((photos: QuickLookPhoto[], index: number, title?: string) => {
    if (photos.length) setLook({ photos, index, title })
  }, [])

  const api: DesktopApi = useMemo(
    () => ({ tree, isMobile, open, goBack, replaceSpec, close, quickLook, copyLink, toast }),
    [tree, isMobile, open, goBack, replaceSpec, close, quickLook, copyLink, toast]
  )

  // Esc closes the front window (Quick Look and menus handle their own Esc first).
  useEffect(() => {
    if (passthrough) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || look) return
      if ((e.target as HTMLElement)?.closest('input, textarea')) return
      if (front) close(front.id)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [passthrough, look, front, close])

  // The desktop sits under the metal header; track its height.
  const deskRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (passthrough) return
    const header = document.querySelector('header.metal') as HTMLElement | null
    const desk = deskRef.current
    if (!header || !desk) return
    const sync = () => desk.style.setProperty('--desk-top', `${header.offsetHeight}px`)
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(header)
    return () => ro.disconnect()
  }, [passthrough])

  if (passthrough) return <>{children}</>

  // ── Desktop icons ───────────────────────────────────
  const deskEntries: FloatEntry[] = [
    ...rootFolders(tree).map(f => folderEntry(tree, f, api)),
    {
      id: 'about',
      label: 'About',
      icon: <img className="ficon-img app" src="/desk/about-smiley.png" alt="" draggable={false} />,
      cell: { w: 104, h: 108 },
      onOpen: () => open({ kind: 'about' }),
      menu: [
        { label: 'Open', onSelect: () => open({ kind: 'about' }) },
        { label: 'Copy Link', onSelect: () => copyLink('/about') },
      ],
    },
    ...(['instagram', 'tiktok'] as const).map(
      (network): FloatEntry => ({
        id: network,
        label: SOCIALS[network].name,
        icon: <img className="ficon-img app" src={`/desk/${network}.png`} alt="" draggable={false} />,
        cell: { w: 104, h: 108 },
        onOpen: () => open({ kind: 'social', network }),
        menu: [
          { label: 'Open', onSelect: () => open({ kind: 'social', network }) },
          {
            label: `Open in ${SOCIALS[network].name}`,
            onSelect: () => window.open(SOCIALS[network].url, '_blank', 'noopener'),
          },
        ],
      })
    ),
    {
      id: 'tv',
      label: 'TV',
      icon: <DeskIcon name="tv" />,
      cell: { w: 104, h: 108 },
      onOpen: () => open({ kind: 'tv' }),
      menu: [
        { label: 'Open', onSelect: () => open({ kind: 'tv' }) },
        { label: 'Copy Link', onSelect: () => copyLink('/tv') },
      ],
    },
    {
      id: 'events',
      label: 'Events',
      icon: <DeskIcon name="ticket" />,
      cell: { w: 104, h: 108 },
      onOpen: () => open({ kind: 'events' }),
      menu: [
        { label: 'Open', onSelect: () => open({ kind: 'events' }) },
        { label: 'Copy Link', onSelect: () => copyLink('/events') },
      ],
    },
    // DOS games (data/games.ts): a colour icon from the game's own art.
    ...GAMES.map(
      (g): FloatEntry => ({
        id: `game:${g.id}`,
        label: g.name,
        icon: <img className="ficon-img" src={g.icon} alt="" draggable={false} />,
        cell: { w: 130, h: 96 },
        onOpen: () => open({ kind: 'game', gameId: g.id }),
        menu: [
          { label: 'Play', onSelect: () => open({ kind: 'game', gameId: g.id }) },
          { label: 'Copy Link', onSelect: () => copyLink(`/${g.id}`) },
        ],
      })
    ),
    // Closing the player leaves its icon on the desktop to bring it back.
    ...(!playerOpen
      ? [
          {
            id: 'player',
            label: 'Media Player',
            icon: <DeskIcon name="char-headphones" />,
            cell: { w: 104, h: 108 },
            onOpen: () => setPlayerOpen(true),
          } satisfies FloatEntry,
        ]
      : []),
    // Only a signed-in admin ever sees this icon; to everyone else /admin stays
    // an unlisted URL. It's a convenience, never the access control.
    ...(isAdmin
      ? [
          {
            id: 'admin',
            label: 'Admin',
            icon: <DeskIcon name="lock" />,
            cell: { w: 104, h: 108 },
            onOpen: () => window.location.assign('/admin'),
          } satisfies FloatEntry,
        ]
      : []),
  ]

  const frameFor = (w: Win): FrameProps => ({
    win: w,
    api,
    active: front?.id === w.id,
    isMobile,
    onFocus: () => focus(w.id),
    onClose: () => close(w.id),
    onGeom: geom => setGeom(w.id, { geom }),
    onToggleMax: () => setGeom(w.id, { maximized: !w.maximized }),
  })

  return (
    <ContextMenuProvider>
      <div ref={deskRef} className={`desktop${isMobile ? ' mobile' : ''}`}>
        <div className="desktop-wallpaper" aria-hidden="true">
          {DESKTOP_ART && <img className="desktop-art" src={DESKTOP_ART} alt="" />}
        </div>

        <FloatField
          scope="desktop"
          entries={deskEntries}
          arrange={isMobile ? 'rows' : 'right-column'}
          draggable={!isMobile}
          fill
          className="desktop-icons"
          backgroundMenu={[
            { label: 'About Aviv Shmuelof', onSelect: () => open({ kind: 'about' }) },
            { label: 'Search…', onSelect: () => open({ kind: 'search', q: '' }) },
          ]}
        />

        {playerOpen && <MediaPlayer isMobile={isMobile} onClose={() => setPlayerOpen(false)} />}

        {wins.map(w => (
          <WindowFor key={w.id} frame={frameFor(w)} />
        ))}

        {/* Route output: pages render nothing on the desktop, but not-found does. */}
        {childrenPath === pathname && children}

        {toastMsg && (
          <div className="desk-toast" role="status">
            <PixIcon name="check" size={14} />
            {toastMsg}
          </div>
        )}
      </div>

      <SecretBubble />
      <BootScreen />
      {look && (
        <Lightbox
          photos={look.photos}
          index={look.index}
          folderName={look.title}
          onClose={() => setLook(null)}
          onPrev={() => setLook(l => l && { ...l, index: (l.index - 1 + l.photos.length) % l.photos.length })}
          onNext={() => setLook(l => l && { ...l, index: (l.index + 1) % l.photos.length })}
        />
      )}
    </ContextMenuProvider>
  )
}

function WindowFor({ frame }: { frame: FrameProps }) {
  const { spec } = frame.win
  switch (spec.kind) {
    case 'folder':
      return <FolderWindow frame={frame} folderId={spec.folderId} />
    case 'photo':
      return <PhotoWindow frame={frame} itemId={spec.itemId} />
    case 'film':
      return <FilmWindow frame={frame} itemId={spec.itemId} />
    case 'about':
      return <AboutWindow frame={frame} />
    case 'search':
      return <SearchWindow frame={frame} q={spec.q} />
    case 'info':
      return <InfoWindow frame={frame} target={spec.target} />
    case 'social':
      return <SocialWindow frame={frame} network={spec.network} />
    case 'game':
      return <GameWindow frame={frame} gameId={spec.gameId} />
    case 'events':
      return <EventsWindow frame={frame} />
    case 'tv':
      return <TvWindow frame={frame} />
  }
}
