'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const GRID_COLS = 96
const INK_THRESHOLD = 140
const TARGET_WIDTH = 130
const DEPTH = 8

interface ImageMask {
  cols: number
  rows: number
  cells: boolean[]
}

function useImageMask(src: string): ImageMask | null {
  const [mask, setMask] = useState<ImageMask | null>(null)

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const cols = GRID_COLS
      const rows = Math.max(1, Math.round(cols * (img.height / img.width)))

      const canvas = document.createElement('canvas')
      canvas.width = cols
      canvas.height = rows
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, cols, rows)

      const { data } = ctx.getImageData(0, 0, cols, rows)
      const cells: boolean[] = new Array(cols * rows)
      for (let i = 0; i < cols * rows; i++) {
        const r = data[i * 4]
        const g = data[i * 4 + 1]
        const b = data[i * 4 + 2]
        cells[i] = (r + g + b) / 3 < INK_THRESHOLD
      }

      if (!cancelled) setMask({ cols, rows, cells })
    }
    img.src = src
    return () => {
      cancelled = true
    }
  }, [src])

  return mask
}

function VoxelSmiley({ mask }: { mask: ImageMask }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const groupRef = useRef<THREE.Group>(null)

  const { positions, count, cellSize } = useMemo(() => {
    const { cols, rows, cells } = mask
    const cellSize = TARGET_WIDTH / cols
    const totalW = cols * cellSize
    const totalH = rows * cellSize
    const positions: [number, number][] = []
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (cells[y * cols + x]) {
          const px = x * cellSize - totalW / 2 + cellSize / 2
          const py = totalH / 2 - y * cellSize - cellSize / 2
          positions.push([px, py])
        }
      }
    }
    return { positions, count: positions.length, cellSize }
  }, [mask])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    positions.forEach(([x, y], i) => {
      dummy.position.set(x, y, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [positions])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4
      groupRef.current.rotation.x = -0.15
    }
  })

  if (count === 0) return null

  return (
    <group ref={groupRef}>
      <instancedMesh key={count} ref={meshRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[cellSize * 0.96, cellSize * 0.96, DEPTH]} />
        <meshStandardMaterial color="#141414" roughness={0.4} metalness={0.12} />
      </instancedMesh>
    </group>
  )
}

export default function Smiley3D() {
  const mask = useImageMask('/crispy.jpg')

  return (
    <Canvas
      camera={{ position: [0, 0, 200], fov: 30 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[60, 90, 120]} intensity={1.1} />
      <directionalLight position={[-60, -40, 60]} intensity={0.25} />
      {mask && <VoxelSmiley mask={mask} />}
    </Canvas>
  )
}
