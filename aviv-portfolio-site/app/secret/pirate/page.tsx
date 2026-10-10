import type { Metadata } from 'next'
import PiratePage from '@/components/secret/PiratePage'

// The second secret layer, under the dungeon. Kept out of search results.
export const metadata: Metadata = {
  title: "Crispy's Secret Pirate Port",
  robots: { index: false, follow: false },
}

export default function Page() {
  return <PiratePage />
}
