'use client'

import dynamic from 'next/dynamic'

// react-three-fiber needs a browser, so this stays client-only. `ssr: false`
// is only legal inside a Client Component, hence this wrapper.
const Smiley3D = dynamic(() => import('./Smiley3D'), { ssr: false })

export default function SmileyStage() {
  return (
    <div className="smiley-stage">
      <div className="smiley-canvas-wrap">
        <Smiley3D />
      </div>
    </div>
  )
}
