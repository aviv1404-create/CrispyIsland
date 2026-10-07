'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Tree } from '@/lib/types'
import AdminApp from './AdminApp'
import MobileAdmin from './MobileAdmin'
import type { UploadMode } from './uploads'

interface Props {
  initialTree: Tree
  initialRev: string
  uploadMode: UploadMode
  user: string
  readOnly?: boolean
}

const QUERY = '(max-width: 760px), (pointer: coarse) and (max-width: 1024px)'
const KEY = 'admin:view'

/** One /admin: the pocket layout on phones, the full layout on computers. Either can be forced. */
export default function AdminShell(props: Props) {
  const small = useSyncExternalStore(
    cb => {
      const mq = window.matchMedia(QUERY)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(QUERY).matches,
    () => false
  )
  const [forced, setForced] = useState<'phone' | 'computer' | null>(null)
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY)
      if (v === 'phone' || v === 'computer') setForced(v)
    } catch {}
  }, [])
  const choose = (v: 'phone' | 'computer') => {
    setForced(v)
    try {
      localStorage.setItem(KEY, v)
    } catch {}
  }

  const phone = forced ? forced === 'phone' : small
  return phone ? (
    <MobileAdmin {...props} onSwitchView={() => choose('computer')} />
  ) : (
    <AdminApp {...props} onSwitchView={() => choose('phone')} />
  )
}
