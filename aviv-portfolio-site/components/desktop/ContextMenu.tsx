'use client'

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'

export type MenuItem =
  | { label: string; onSelect: () => void; disabled?: boolean; hint?: string; separator?: never }
  | { separator: true; label?: never; onSelect?: never; disabled?: never; hint?: never }

interface MenuState {
  x: number
  y: number
  items: MenuItem[]
}

const Ctx = createContext<{ openMenu: (x: number, y: number, items: MenuItem[]) => void }>({
  openMenu: () => {},
})

export function useContextMenu() {
  return useContext(Ctx)
}

/** One context menu for the whole desktop — classic Mac pull-down styling. */
export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState<MenuState | null>(null)
  const openMenu = useCallback((x: number, y: number, items: MenuItem[]) => {
    setMenu({ x, y, items })
  }, [])

  return (
    <Ctx.Provider value={{ openMenu }}>
      {children}
      {menu && <Menu {...menu} onClose={() => setMenu(null)} />}
    </Ctx.Provider>
  )
}

function Menu({ x, y, items, onClose }: MenuState & { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })
  const [active, setActive] = useState(-1)

  // Keep the menu on screen.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({
      x: Math.max(4, Math.min(x, window.innerWidth - r.width - 4)),
      y: Math.max(4, Math.min(y, window.innerHeight - r.height - 4)),
    })
    el.focus()
  }, [x, y])

  useEffect(() => {
    const close = () => onClose()
    window.addEventListener('blur', close)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('blur', close)
      window.removeEventListener('resize', close)
    }
  }, [onClose])

  const selectable = items
    .map((it, i) => (it.separator || it.disabled ? -1 : i))
    .filter(i => i >= 0)

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const at = selectable.indexOf(active)
      const next =
        e.key === 'ArrowDown'
          ? selectable[(at + 1) % selectable.length]
          : selectable[(at - 1 + selectable.length) % selectable.length]
      setActive(next ?? -1)
    } else if (e.key === 'Enter' && active >= 0) {
      const it = items[active]
      if (!it.separator && !it.disabled) {
        onClose()
        it.onSelect()
      }
    }
  }

  return (
    <div
      className="ctx-backdrop"
      onPointerDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      onContextMenu={e => {
        e.preventDefault()
        onClose()
      }}
    >
      <div
        ref={ref}
        className="ctx-menu"
        role="menu"
        tabIndex={-1}
        style={{ left: pos.x, top: pos.y }}
        onKeyDown={onKey}
      >
        {items.map((it, i) =>
          it.separator ? (
            <div key={i} className="ctx-sep" role="separator" />
          ) : (
            <button
              key={i}
              type="button"
              role="menuitem"
              className={`ctx-item${i === active ? ' active' : ''}`}
              disabled={it.disabled}
              onPointerEnter={() => setActive(i)}
              onClick={() => {
                onClose()
                it.onSelect()
              }}
            >
              <span>{it.label}</span>
              {it.hint && <span className="ctx-hint">{it.hint}</span>}
            </button>
          )
        )}
      </div>
    </div>
  )
}
