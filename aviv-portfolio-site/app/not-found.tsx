import Link from 'next/link'
import PixIcon from '@/components/PixIcon'

/** A classic alert box on the desktop, instead of a bare 404 page. */
export default function NotFound() {
  return (
    <div className="desk-alert-wrap">
      <div className="win-dialog desk-alert" role="alertdialog" aria-labelledby="nf-title">
        <PixIcon name="warning" size={40} className="desk-alert-icon" />
        <p id="nf-title" className="win-dialog-title">
          The item couldn’t be found.
        </p>
        <p className="win-dialog-note">It may have been moved, renamed or deleted.</p>
        <div className="win-dialog-actions">
          <Link href="/" className="win-btn primary">
            OK
          </Link>
        </div>
      </div>
    </div>
  )
}
