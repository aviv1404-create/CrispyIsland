import type { Metadata } from 'next'
import SecretPage from '@/components/secret/SecretPage'

// A hidden page: reached from the pop-up, kept out of search results.
export const metadata: Metadata = {
  title: "Crispy's Secret Page",
  robots: { index: false, follow: false },
}

export default function Page() {
  return <SecretPage />
}
