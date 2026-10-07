/**
 * The STARTING list for the Events app — once events are edited in the
 * admin, the admin's list (saved with the content) is used instead.
 *
 * The Events app on the desktop: a Cover Flow of event posters. Click a
 * poster for that event's page — details plus a Cover Flow of its photos.
 *
 * Photos come from the admin: make a folder (anywhere, e.g. Photography →
 * Music) and put its slug in `folderSlug`. A folder named "DARIACOOK SUMMER
 * FESTIVAL" gets the slug `dariacook-summer-festival`.
 * `poster` is optional — without one, the folder's cover photo is used.
 * Newest event first.
 */
import type { SiteEvent, Tree } from '@/lib/types'

export type EventInfo = SiteEvent

export const EVENTS: EventInfo[] = [
  {
    id: 'sochar-hayam-pop-up',
    title: 'פופ אפ — Sochar HaYam Pop-Up',
    date: '27–28.2',
    about: 'בגדי סוחר הים, מבצעים חגיגים, חבילות הפתעה ועוד… — the Sochar HaYam clothing pop-up: deals, surprise packs and more.',
    poster: '/events/sochar-hayam-pop-up.jpg',
    folderSlug: 'sochar-hayam-pop-up',
    link: { label: 'See the clothing', href: '/sochar-hayam' },
  },
  {
    id: 'crispy-sound-systems',
    title: 'Crispy Sound Systems',
    date: '17.8',
    place: 'Sira Bar',
    about: 'An exploration of the underground Mod tracker scene — for only one night.',
    poster: '/events/crispy-sound-systems.jpg',
    folderSlug: 'crispy-sound-systems',
  },
  {
    id: 'balkan-party',
    title: 'חינגת השנה — חגיגה בלקנית',
    date: '08.09',
    place: 'המפעל, רחוב המערבים 3',
    about: 'Party of the year — a Balkan celebration at HaMifal.',
    poster: '/events/balkan-party.jpg',
    folderSlug: 'balkan-party',
  },
  {
    id: 'dor4-last-show',
    title: 'DOR4 — Last Show',
    date: '11.2.23',
    place: 'Blaze, Jerusalem',
    about: 'New songs, old songs, a new CD — special guest The Voices of East.',
    poster: '/events/dor4-last-show.jpg',
    folderSlug: 'dor4-last-show',
  },
]

/** The events to show: the admin's list once it has been edited, else this bundled one. */
export const eventsOf = (tree: Tree): SiteEvent[] => tree.events ?? EVENTS
