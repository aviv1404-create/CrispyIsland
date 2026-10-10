'use client'

import { useRef, useState } from 'react'
import PixIcon from '@/components/PixIcon'
import type { Win, WinGeom } from './types'

interface WindowProps {
  win: Win
  title: string
  active: boolean
  /** default size before the visitor resizes it */
  size: { w: number; h: number }
  minSize?: { w: number; h: number }
  dark?: boolean
  isMobile: boolean
  toolbar?: React.ReactNode
  status?: React.ReactNode
  children: React.ReactNode
  onFocus: () => void
  onClose: () => void
  onGeom: (geom: WinGeom) => void
  onToggleMax: () => void
  /** Adds a "mini" button: the window shrinks to a small floating box (this
   *  wide) that can be dragged around while its content keeps running. The
   *  content restyles itself with `.dwin.mini`. */
  mini?: { w: number; h: number; label?: string }
}

const CASCADE = 26

/**
 * A movable, resizable window. Until it's first touched, CSS centres it (so it
 * renders correctly on the server); the first drag or resize switches it to
 * explicit pixel geometry.
 */
export default function Window({
  win,
  title,
  active,
  size,
  minSize = { w: 280, h: 200 },
  dark = false,
  isMobile,
  toolbar,
  status,
  children,
  onFocus,
  onClose,
  onGeom,
  onToggleMax,
  mini,
}: WindowProps) {
  const ref = useRef<HTMLDivElement>(null)
  // Mini mode keeps its own spot, so going back to full size lands where it was.
  const [miniPos, setMiniPos] = useState<{ x: number; y: number } | null>(null)
  const isMini = !!mini && !!miniPos && !isMobile

  const currentGeom = (): WinGeom => {
    const el = ref.current!
    return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }
  }

  const bounds = () => {
    const parent = ref.current?.parentElement
    return { w: parent?.clientWidth ?? window.innerWidth, h: parent?.clientHeight ?? window.innerHeight }
  }

  const toggleMini = () => {
    if (!mini) return
    if (isMini) return setMiniPos(null)
    const b = bounds()
    setMiniPos({ x: Math.max(8, b.w - mini.w - 20), y: Math.max(8, b.h - mini.h - 20) })
  }

  const startDrag = (e: React.PointerEvent) => {
    if (e.button !== 0 || isMobile || (win.maximized && !isMini)) return
    if ((e.target as HTMLElement).closest('button, a, input')) return
    e.preventDefault()
    const g0 = currentGeom()
    const sx = e.clientX
    const sy = e.clientY
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    ref.current?.classList.add('dragging')

    const move = (ev: PointerEvent) => {
      const b = bounds()
      // Keep the title bar reachable: never above the desktop, never fully off a side.
      const x = Math.min(Math.max(g0.x + ev.clientX - sx, 60 - g0.w), b.w - 60)
      const y = Math.min(Math.max(g0.y + ev.clientY - sy, 0), b.h - 28)
      if (isMini) setMiniPos({ x, y })
      else onGeom({ ...g0, x, y })
    }
    const up = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
      ref.current?.classList.remove('dragging')
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
  }

  const startResize = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const g0 = currentGeom()
    const sx = e.clientX
    const sy = e.clientY
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)

    const move = (ev: PointerEvent) => {
      const b = bounds()
      const w = Math.min(Math.max(minSize.w, g0.w + ev.clientX - sx), b.w - g0.x)
      const h = Math.min(Math.max(minSize.h, g0.h + ev.clientY - sy), b.h - g0.y)
      onGeom({ ...g0, w, h })
    }
    const up = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
  }

  const off = (win.cascade % 6) * CASCADE
  let style: React.CSSProperties
  if (isMini && miniPos && mini) {
    style = { left: miniPos.x, top: miniPos.y, width: mini.w, zIndex: 10 + win.z }
  } else if (isMobile || win.maximized) {
    style = { left: 0, top: 0, width: '100%', height: '100%', zIndex: 10 + win.z }
  } else if (win.geom) {
    style = { left: win.geom.x, top: win.geom.y, width: win.geom.w, height: win.geom.h, zIndex: 10 + win.z }
  } else {
    const w = `min(${size.w}px, calc(100% - 32px))`
    const h = `min(${size.h}px, calc(100% - 32px))`
    style = {
      width: w,
      height: h,
      left: `calc((100% - ${w}) / 2 + ${off - 2 * CASCADE}px)`,
      top: `max(8px, calc((100% - ${h}) / 2 + ${off - 2 * CASCADE}px))`,
      zIndex: 10 + win.z,
    }
  }

  return (
    <div
      ref={ref}
      className={`dwin${active ? ' active' : ''}${dark ? ' dark' : ''}${win.closing ? ' closing' : ''}${
        win.maximized && !isMini ? ' maximized' : ''
      }${isMini ? ' mini' : ''}`}
      style={style}
      role="dialog"
      aria-label={title}
      onPointerDownCapture={onFocus}
    >
      <div className="win-titlebar dwin-titlebar" onPointerDown={startDrag} onDoubleClick={isMini ? toggleMini : onToggleMax}>
        <button type="button" className="win-close" onClick={onClose} aria-label={`Close ${title}`} title="Close">
          <PixIcon name="x" size={13} />
        </button>
        <span className="win-title">{title}</span>
        {!isMobile && mini && (
          <button
            type="button"
            className="win-zoom win-mini"
            onClick={toggleMini}
            aria-label={isMini ? 'Back to full size' : `Shrink to a mini ${mini.label ?? 'window'}`}
            title={isMini ? 'Full size' : `Mini ${mini.label ?? 'window'}`}
          >
            <PixIcon name={isMini ? 'expand' : 'compress'} size={13} />
          </button>
        )}
        {!isMobile && !isMini && (
          <button
            type="button"
            className="win-zoom"
            onClick={onToggleMax}
            aria-label={win.maximized ? 'Restore window size' : 'Make window bigger'}
            title={win.maximized ? 'Restore size' : 'Make bigger'}
          >
            <PixIcon name={win.maximized ? 'fullscreen' : 'expand-2'} size={13} />
          </button>
        )}
      </div>
      {toolbar}
      <div className="dwin-body">{children}</div>
      {status !== undefined && !isMini && <div className="win-status dwin-status">{status}</div>}
      {!isMobile && !win.maximized && !isMini && (
        <span className="dwin-grip" onPointerDown={startResize} aria-hidden="true" />
      )}
    </div>
  )
}
