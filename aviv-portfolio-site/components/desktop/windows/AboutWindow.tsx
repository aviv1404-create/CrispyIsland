'use client'

import ContactList, { CONTACT_EMAIL } from '@/components/ContactList'
import { SOCIALS, type SocialNetwork } from '@/data/socials'
import SocialPortal from '../SocialPortal'
import Window from '../Window'
import SecretLogin from '../SecretLogin'
import ClientStrip from '../ClientStrip'
import { ADMIN_DEMO_URL } from '@/data/secret'
import { useRef, useState } from 'react'
import type { FrameProps } from './frame'
import VisitCounter from '../VisitCounter'

// Pixel badges Aviv drew for each place (public/logos/badge-*.png).
// `href` (optional): clicking the badge opens that site in a new tab.
interface Badge {
  name: string
  hebrew: string
  detail: string
  logo: string
  href?: string
}

const EDUCATION: Badge[] = [
  {
    name: 'ORT Psagot Karmiel — College of Film & Television',
    hebrew: 'אורט פסגות כרמיאל — מכללה לקולנוע וטלוויזיה',
    detail: 'Film & Television Engineering',
    logo: '/logos/badge-ort.png',
    href: 'https://film-psagot.ort.org.il/',
  },
  {
    name: 'The Arts High School',
    hebrew: 'התיכון לאמנויות',
    detail: '',
    logo: '/logos/badge-arts.png',
    href: 'https://jer-art-school.org.il/',
  },
]

const SERVICE: Badge[] = [
  {
    name: 'Israeli Navy — Operational Photographer',
    hebrew: 'חיל הים — צלם מבצעי',
    detail: 'Three years of service',
    logo: '/logos/badge-navy.png',
    href: 'https://www.idf.il/%D7%90%D7%AA%D7%A8%D7%99-%D7%99%D7%97%D7%99%D7%93%D7%95%D7%AA/%D7%96%D7%A8%D7%95%D7%A2-%D7%94%D7%99%D7%9D/',
  },
  {
    name: 'Peak Production — Member',
    hebrew: 'פיק הפקות — חבר צוות',
    detail: 'One of the key members',
    logo: '/logos/badge-peak.png',
    href: 'https://www.peakstudios.video/',
  },
]

function Badges({ list }: { list: Badge[] }) {
  return (
    <ul className="edu-list">
      {list.map(e => {
        const body = (
          <>
            <span className="edu-logo">
              <img src={e.logo} alt="" />
            </span>
            <span className="edu-text">
              <strong>
                {e.name}
                {e.href && (
                  <span className="edu-go" aria-hidden="true">
                    {' '}↗
                  </span>
                )}
              </strong>
              <span lang="he" dir="rtl">
                {e.hebrew}
              </span>
              {e.detail && <span className="edu-detail">{e.detail}</span>}
            </span>
          </>
        )
        return (
          <li key={e.name} className="edu-item">
            {e.href ? (
              <a className="edu-link" href={e.href} target="_blank" rel="noopener noreferrer" title={`Open ${e.name.split(' — ')[0]}`}>
                {body}
              </a>
            ) : (
              body
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function AboutWindow({ frame }: { frame: FrameProps }) {
  // Secret: three quick clicks on "Crispy" open the admin code box.
  const [login, setLogin] = useState(false)
  const clicks = useRef<number[]>([])
  const tap = () => {
    const now = Date.now()
    clicks.current = [...clicks.current.filter(t => now - t < 900), now]
    if (clicks.current.length >= 3) {
      clicks.current = []
      setLogin(true)
    }
  }
  return (
    <>
    {login && <SecretLogin onClose={() => setLogin(false)} demoUrl={ADMIN_DEMO_URL || undefined} />}
    <Window {...frame} title="About" size={{ w: 1120, h: 700 }} minSize={{ w: 300, h: 260 }} status={CONTACT_EMAIL}>
      <div className="dwin-scroll about-layout">
        <div className="leaf">
          {frame.api.isAdmin && <VisitCounter />}
          <h1 className="leaf-title about-name">Aviv Shmuelof</h1>
          <p className="about-alias" onClick={tap}>Crispy</p>

          <h2 className="leaf-heading">Service</h2>
          <Badges list={SERVICE} />

          <h2 className="leaf-heading edu-gap">Education</h2>
          <Badges list={EDUCATION} />

          <h2 className="leaf-heading edu-gap">Worked with</h2>
          <ClientStrip />

          <div className="leaf-rule" />

          <h2 className="leaf-heading">Contact</h2>
          <ContactList />
        </div>

        {/* Two portals into the apps — each can pop out into its own window. */}
        <div className="about-portals">
          {(['instagram', 'tiktok'] as const).map(network => (
            <PortalPane key={network} network={network} onPopOut={() => frame.api.open({ kind: 'social', network })} />
          ))}
        </div>
      </div>
    </Window>
    </>
  )
}

function PortalPane({ network, onPopOut }: { network: SocialNetwork; onPopOut: () => void }) {
  return (
    <section className="portal-pane" aria-label={`${SOCIALS[network].name} portal`}>
      <div className="win-titlebar portal-pane-bar">
        <span className="win-title">{SOCIALS[network].name}</span>
        <button type="button" className="win-zoom" onClick={onPopOut} aria-label={`Open ${SOCIALS[network].name} in its own window`} title="Pop out" />
      </div>
      <SocialPortal network={network} />
    </section>
  )
}
