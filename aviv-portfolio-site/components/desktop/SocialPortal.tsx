'use client'

import { useState } from 'react'
import { SOCIALS, instagramEmbedSrc, type SocialNetwork } from '@/data/socials'

/**
 * A little phone-app view into Instagram or TikTok. Used twice: as the two
 * portals inside the About window, and as a standalone window when popped out.
 */
export default function SocialPortal({ network }: { network: SocialNetwork }) {
  const [acc, setAcc] = useState(0)
  const accounts = SOCIALS.instagram.accounts
  const ig = accounts[acc] ?? accounts[0]
  const who = network === 'instagram' ? ig : SOCIALS.tiktok
  return (
    <div className={`portal portal-${network}`}>
      {network === 'instagram' && accounts.length > 1 && (
        <div className="portal-tabs" role="tablist" aria-label="Instagram accounts">
          {accounts.map((a, i) => (
            <button key={a.handle} type="button" role="tab" aria-selected={i === acc} className={i === acc ? 'on' : ''} onClick={() => setAcc(i)}>
              @{a.handle}
              <small>{a.label}</small>
            </button>
          ))}
        </div>
      )}
      <div className="portal-appbar">
        <span className="portal-avatar">
          <img src="/crispy.jpg" alt="" />
        </span>
        <span className="portal-who">
          <strong>@{who.handle}</strong>
          <span>{SOCIALS[network].name}</span>
        </span>
        <a className="portal-follow" href={who.url} target="_blank" rel="noopener noreferrer">
          Open
        </a>
      </div>
      <div className="portal-feed">{network === 'tiktok' ? <TikTokFeed /> : <InstagramFeed key={ig.handle} account={ig} />}</div>
    </div>
  )
}

function TikTokFeed() {
  const { handle } = SOCIALS.tiktok
  return (
    <iframe
      className="portal-frame"
      src={`/embeds/tiktok-profile.html?u=${encodeURIComponent(handle)}`}
      title={`@${handle} on TikTok`}
      loading="lazy"
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
    />
  )
}

function InstagramFeed({ account }: { account: { handle: string; url: string; posts: readonly string[] } }) {
  const { handle, url, posts } = account
  const embeds = posts.map(instagramEmbedSrc).filter((s): s is string => !!s)

  if (embeds.length === 0) {
    // No posts picked yet: a profile card in Instagram's grid language.
    return (
      <div className="portal-card">
        <div className="portal-card-head">
          <span className="portal-card-avatar">
            <img src="/crispy.jpg" alt="" />
          </span>
          <strong>@{handle}</strong>
          <a className="portal-cta" href={url} target="_blank" rel="noopener noreferrer">
            View profile on Instagram
          </a>
        </div>
        <div className="portal-grid" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="portal-scroll">
      {embeds.map(src => (
        <iframe
          key={src}
          className="portal-post"
          src={src}
          title={`Post by @${handle}`}
          loading="lazy"
        />
      ))}
    </div>
  )
}
