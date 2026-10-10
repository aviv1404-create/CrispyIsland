/**
 * "Worked with" — the scrolling strip of logos in the About window.
 * Put logo files in public/clients/ (PNG with a transparent background works
 * best). Without a logo the name is shown as text. `name` is the hover text
 * — leave it empty if there's nothing to say.
 */
export interface Client {
  name: string
  logo?: string
  href?: string
}

export const CLIENTS: Client[] = [
  { name: 'Sira', logo: '/clients/sira.png' },
  { name: '', logo: '/clients/building.png' },
  { name: 'זהב שמור', logo: '/clients/zahav-shamur.png' },
  { name: 'Teder.fm', logo: '/clients/teder.png', href: 'https://www.teder.fm' },
  { name: 'LEV', logo: '/clients/lev.png' },
  { name: '', logo: '/clients/round-yellow.png' },
  { name: '', logo: '/clients/blue-cloud.png' },
]
