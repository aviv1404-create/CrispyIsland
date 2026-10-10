/**
 * The Instagram and TikTok "portal" windows on the About page.
 *
 * TikTok shows the live profile (TikTok's own creator embed: profile header
 * plus up to ten recent videos) — nothing to maintain.
 *
 * Instagram has no profile embed, only single posts. Paste post or reel links
 * into `posts` (e.g. 'https://www.instagram.com/p/ABC123/') and they'll show
 * in the window, in this order. Until then it shows a profile card.
 *
 * Instagram has more than one account: `accounts` are the tabs at the top of
 * the Instagram window (the first one is the main page).
 */
export const SOCIALS = {
  instagram: {
    name: 'Instagram',
    handle: 'crispy1404',
    url: 'https://www.instagram.com/crispy1404/',
    posts: [] as string[],
    accounts: [
      { handle: 'crispy1404', label: 'Main', url: 'https://www.instagram.com/crispy1404/', posts: [] as string[] },
      { handle: 'crispy_textiles', label: 'Clothing', url: 'https://www.instagram.com/crispy_textiles/', posts: [] as string[] },
    ],
  },
  tiktok: {
    name: 'TikTok',
    handle: 'crispy_island',
    url: 'https://www.tiktok.com/@crispy_island',
  },
} as const

export type SocialNetwork = keyof typeof SOCIALS

/** https://www.instagram.com/p/CODE/ or /reel/CODE/ → its embeddable page. */
export function instagramEmbedSrc(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:[\w.]+\/)?(p|reel|tv)\/([\w-]+)/)
  return m ? `https://www.instagram.com/${m[1]}/${m[2]}/embed/` : null
}
