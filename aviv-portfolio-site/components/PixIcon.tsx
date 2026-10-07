/**
 * Aviv's own pixel icon set (public/icons/*.png, cut from his two sheets).
 * Each PNG is a black shape on transparent; it's used as a CSS mask, so the
 * icon takes whatever text colour it sits in — black on the desktop, light
 * in dark windows, blue when selected.
 */
import type { PixName } from '@/lib/pix-icons'

export { PIX_ICONS, isPixName, type PixName } from '@/lib/pix-icons'

export default function PixIcon({
  name,
  size = 16,
  className = '',
  title,
}: {
  name: PixName
  size?: number
  className?: string
  title?: string
}) {
  return (
    <span
      className={`pix ${className}`}
      style={{ width: size, height: size, ['--pix' as string]: `url(/icons/${name}.png)` }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  )
}
