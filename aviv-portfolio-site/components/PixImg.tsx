'use client'

import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react'

const cache = new Map<string, string>()

/** Turn a photo's `px` code ("w,h,RGB…" in 4-bit hex) into a tiny PNG. */
export function pxDataUrl(px: string | undefined): string | undefined {
  if (!px || typeof document === 'undefined') return undefined
  const hit = cache.get(px)
  if (hit) return hit
  const [w, h, hex] = px.split(',')
  const width = Number(w)
  const height = Number(h)
  if (!width || !height || !hex || hex.length < width * height * 3) return undefined
  try {
    const c = document.createElement('canvas')
    c.width = width
    c.height = height
    const g = c.getContext('2d')!
    const img = g.createImageData(width, height)
    for (let p = 0; p < width * height; p++) {
      for (let k = 0; k < 3; k++) img.data[p * 4 + k] = parseInt(hex[p * 3 + k], 16) * 17
      img.data[p * 4 + 3] = 255
    }
    g.putImageData(img, 0, 0)
    const url = c.toDataURL('image/png')
    cache.set(px, url)
    return url
  } catch {
    return undefined
  }
}

/**
 * A photo that arrives the Crispy way: until it has loaded, its 8-pixel
 * version shows as big chunky pixels (no download needed — it's stored with
 * the content); then the real photo snaps in with a short flash. Photos the
 * browser already has show straight away.
 */
export default function PixImg({ px, className, onLoad, style, ...rest }: ImgHTMLAttributes<HTMLImageElement> & { px?: string }) {
  const ref = useRef<HTMLImageElement>(null)
  const [state, setState] = useState<'wait' | 'in' | 'ok'>('wait')
  const [bg, setBg] = useState<string | undefined>()

  useEffect(() => {
    setState(ref.current?.complete && ref.current.naturalWidth ? 'ok' : 'wait')
    setBg(pxDataUrl(px))
  }, [rest.src, px])

  useEffect(() => {
    if (state !== 'in') return
    const t = setTimeout(() => setState('ok'), 500)
    return () => clearTimeout(t)
  }, [state])

  const waiting = state === 'wait' && !!bg
  // with the photo's size known, its frame can take the right shape before it arrives
  const sized = waiting && Number(rest.width) > 0 && Number(rest.height) > 0
  return (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img
      ref={ref}
      {...rest}
      className={[className, waiting ? 'pix-wait' : '', sized ? 'pix-sized' : '', state === 'in' ? 'pix-in' : ''].filter(Boolean).join(' ') || undefined}
      style={
        waiting
          ? { ...style, backgroundImage: `url(${bg})`, ...(sized ? { ['--r' as string]: Number(rest.width) / Number(rest.height) } : {}) }
          : style
      }
      onLoad={e => {
        setState(s => (s === 'wait' ? 'in' : s))
        onLoad?.(e)
      }}
    />
  )
}
