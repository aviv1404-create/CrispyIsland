import type { DesktopApi, Win, WinGeom } from '../types'

/** What the desktop hands every window: its state, focus, and the window-manager callbacks. */
export interface FrameProps {
  win: Win
  api: DesktopApi
  active: boolean
  isMobile: boolean
  onFocus: () => void
  onClose: () => void
  onGeom: (geom: WinGeom) => void
  onToggleMax: () => void
}
