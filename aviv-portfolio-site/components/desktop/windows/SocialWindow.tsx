'use client'

import { SOCIALS, type SocialNetwork } from '@/data/socials'
import SocialPortal from '../SocialPortal'
import Window from '../Window'
import type { FrameProps } from './frame'

/** A social portal popped out into its own phone-sized window. */
export default function SocialWindow({ frame, network }: { frame: FrameProps; network: SocialNetwork }) {
  return (
    <Window
      {...frame}
      title={network === 'instagram' ? SOCIALS.instagram.name : `${SOCIALS[network].name} — @${SOCIALS[network].handle}`}
      size={{ w: 400, h: 720 }}
      minSize={{ w: 300, h: 360 }}
    >
      <SocialPortal network={network} />
    </Window>
  )
}
