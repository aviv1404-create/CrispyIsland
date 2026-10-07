import PixIcon from '@/components/PixIcon'

export const CONTACT_EMAIL = 'aviv1404@gmail.com'

/** Contact details, shown on /about. */
export default function ContactList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ContactLink icon={<PixIcon name="mail" size={20} />} label={CONTACT_EMAIL} href={`mailto:${CONTACT_EMAIL}`} />
      <ContactLink
        icon={<PixIcon name="phone-call" size={20} />}
        label="+972 52-630-5303"
        href="https://wa.me/972526305303"
      />
      <ContactLink
        icon={<PixIcon name="photo-camera" size={20} />}
        label="@crispy1404"
        href="https://instagram.com/crispy1404"
      />
      <ContactLink
        icon={<PixIcon name="music" size={20} />}
        label="@crispy_island"
        href="https://www.tiktok.com/@crispy_island"
      />
    </div>
  )
}

function ContactLink({
  icon,
  label,
  href,
  placeholder,
}: {
  icon: React.ReactNode
  label: string
  href: string
  placeholder?: boolean
}) {
  return (
    <a
      href={href}
      target={href.startsWith('mailto') ? undefined : '_blank'}
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        color: placeholder ? '#aaa' : '#222',
        textDecoration: 'none',
        fontSize: 14,
        transition: 'color 0.15s',
        cursor: placeholder ? 'not-allowed' : 'pointer',
      }}
    >
      <span style={{ display: 'flex', opacity: placeholder ? 0.4 : 0.85 }}>{icon}</span>
      <span>
        {label}
        {placeholder && (
          <span style={{ marginLeft: 8, fontSize: 11, letterSpacing: '0.08em', color: '#999' }}>
            COMING SOON
          </span>
        )}
      </span>
    </a>
  )
}
