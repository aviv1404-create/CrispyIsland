'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Drag-to-reorder for a grid or list, with mouse, pen or finger.
 *
 * Each sortable element gets `data-sort-group` + `data-sort-id` and the
 * returned `onPointerDown`. A mouse drag starts after a few pixels of
 * movement (so a plain click still clicks); a touch drag starts at once when
 * `touchImmediate` is on (the phone's Reorder mode, where tiles don't scroll
 * the page) or after a short press-and-hold otherwise. While dragging, the
 * tile follows the pointer, the slot it would land in is marked, and the
 * page scrolls when you hold it near the top or bottom edge.
 */
export function useDragSort({
  group,
  ids,
  onMove,
  enabled = true,
  touchImmediate = false,
}: {
  group: string
  ids: string[]
  onMove: (id: string, toIndex: number) => void
  enabled?: boolean
  touchImmediate?: boolean
}) {
  const [drag, setDrag] = useState<{ id: string; over: number } | null>(null)
  const dragging = useRef(false)
  const suppressClick = useRef(false)
  const idsRef = useRef(ids)
  idsRef.current = ids
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  // A finger drag must stop the page from scrolling underneath it. That
  // needs a non-passive touchmove listener, registered ahead of time.
  useEffect(() => {
    const block = (e: TouchEvent) => {
      if (dragging.current) e.preventDefault()
    }
    document.addEventListener('touchmove', block, { passive: false })
    return () => document.removeEventListener('touchmove', block)
  }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!enabled || (e.pointerType === 'mouse' && e.button !== 0)) return
    if ((e.target as HTMLElement).closest('input, select, textarea, [data-no-drag]')) return
    const el = e.currentTarget
    const id = el.dataset.sortId
    if (!id) return
    const sx = e.clientX
    const sy = e.clientY
    const pointerId = e.pointerId
    const touch = e.pointerType !== 'mouse'
    let started = false
    let over = idsRef.current.indexOf(id)
    let lastX = sx
    let lastY = sy
    let raf = 0
    let hold: ReturnType<typeof setTimeout> | undefined

    const begin = () => {
      if (started) return
      started = true
      dragging.current = true
      el.classList.add('sort-dragging')
      try {
        el.setPointerCapture(pointerId)
      } catch {}
      navigator.vibrate?.(10)
      setDrag({ id, over })
      tick()
    }

    const locate = () => {
      el.style.translate = `${lastX - sx}px ${lastY - sy}px`
      // Look underneath the dragged tile for the slot we're over.
      el.style.pointerEvents = 'none'
      const under = document.elementFromPoint(lastX, lastY)?.closest<HTMLElement>(`[data-sort-group="${group}"]`)
      el.style.pointerEvents = ''
      if (under?.dataset.sortId) {
        const i = idsRef.current.indexOf(under.dataset.sortId)
        if (i >= 0 && i !== over) {
          over = i
          setDrag({ id, over })
        }
      }
    }

    // Auto-scroll near the window's top/bottom edge.
    const tick = () => {
      if (!started) return
      const edge = 70
      const h = window.innerHeight
      const dy = lastY < edge ? -(edge - lastY) / 4 : lastY > h - edge ? (lastY - (h - edge)) / 4 : 0
      if (dy) {
        const scroller = el.closest<HTMLElement>('[data-sort-scroll]')
        if (scroller) scroller.scrollTop += dy
        else window.scrollBy(0, dy)
        locate()
      }
      raf = requestAnimationFrame(tick)
    }

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      lastX = ev.clientX
      lastY = ev.clientY
      const far = Math.hypot(lastX - sx, lastY - sy)
      if (!started) {
        if (touch && !touchImmediate) {
          // moved before the hold finished: it's a scroll, not a drag
          if (far > 8) finish(false)
          return
        }
        if (far < (touch ? 3 : 6)) return
        begin()
      }
      locate()
    }

    const finish = (commit: boolean) => {
      clearTimeout(hold)
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      if (!started) return
      dragging.current = false
      el.classList.remove('sort-dragging')
      el.style.translate = ''
      setDrag(null)
      // The pointerup that ends a drag also fires a click — swallow it.
      suppressClick.current = true
      setTimeout(() => (suppressClick.current = false), 0)
      if (commit && over !== idsRef.current.indexOf(id)) onMoveRef.current(id, over)
    }
    const up = (ev: PointerEvent) => ev.pointerId === pointerId && finish(true)
    const cancel = (ev: PointerEvent) => ev.pointerId === pointerId && finish(false)

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    if (touch && !touchImmediate) hold = setTimeout(begin, 380)
  }

  /** Put on the sortable container: cancels the click that ends a drag. */
  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const itemProps = (id: string) => ({
    'data-sort-group': group,
    'data-sort-id': id,
    onPointerDown,
    className:
      drag && drag.id !== id && idsRef.current.indexOf(id) === drag.over
        ? idsRef.current.indexOf(drag.id) < drag.over
          ? ' sort-over-after'
          : ' sort-over-before'
        : '',
  })

  return { drag, itemProps, onClickCapture }
}
