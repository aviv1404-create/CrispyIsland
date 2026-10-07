import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/components/NavBar'
import Desktop from '@/components/desktop/Desktop'
import { getTree, publicTree } from '@/lib/content'
import { currentAdmin } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Aviv Shmuelof',
  description: 'Filmmaker, photographer, and visual artist.',
}

/**
 * The layout owns the desktop, so open windows survive navigating between
 * routes. Pages under it only supply metadata (and 404s); the desktop reads
 * the URL and opens the matching windows. /admin bypasses the desktop.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [tree, admin] = await Promise.all([getTree(), currentAdmin()])

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <NavBar />
        <main style={{ flex: 1 }}>
          <Desktop tree={publicTree(tree)} isAdmin={!!admin}>
            {children}
          </Desktop>
        </main>
      </body>
    </html>
  )
}
