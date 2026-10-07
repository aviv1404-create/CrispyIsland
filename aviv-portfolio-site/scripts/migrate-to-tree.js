// One-off migration: photography.json + cinema.json + commercial.json  ->  tree.json
//
// Reads the *live* blob data (falling back to the bundled data/*.json when a
// section has never been written), builds the recursive tree, then writes both:
//   - data/tree.json          committed seed / fallback
//   - blob data/tree-<ts>.json  what the site actually reads
//
// The three old blobs are left untouched as a rollback path.
//
//   node scripts/migrate-to-tree.js          # write blob + local seed
//   node scripts/migrate-to-tree.js --dry    # print a summary, write nothing

const fs = require('fs')
const path = require('path')

// Load BLOB_READ_WRITE_TOKEN (and friends) from .env.local without adding a dotenv dependency
const envPath = path.join(__dirname, '..', '.env.local')
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/)
  if (match) process.env[match[1]] = match[2].replace(/^"|"$/g, '')
}

const { list, put } = require('@vercel/blob')

const DRY = process.argv.includes('--dry')

function slugify(name) {
  return (
    String(name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  )
}

function uniqueSlug(base, used) {
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

// Mirrors readJSON in app/api/admin/route.ts: newest timestamped blob wins.
async function readSection(file) {
  const prefix = `data/${file.replace(/\.json$/, '')}-`
  const { blobs } = await list({ prefix })
  if (blobs.length === 0) {
    console.log(`  ${file}: no blob, using bundled data/${file}`)
    return require(path.join(__dirname, '..', 'data', file))
  }
  const latest = blobs.reduce((a, b) => (a.uploadedAt > b.uploadedAt ? a : b))
  const res = await fetch(latest.url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`fetch failed for ${file}: ${res.status}`)
  console.log(`  ${file}: blob ${latest.pathname}`)
  return res.json()
}

let seq = 0
const newId = () => `${Date.now().toString(36)}${(seq++).toString(36).padStart(3, '0')}`

const ROOTS = [
  { slug: 'photography', name: 'Photography', key: 'photos' },
  { slug: 'cinema', name: 'Cinema', key: 'films' },
  { slug: 'commercial', name: 'Commercial', key: 'items' },
]

function migratePhoto(raw, folderId, position) {
  return {
    id: String(raw.id ?? newId()),
    folderId,
    position,
    kind: 'photo',
    title: raw.title ?? '',
    caption: raw.caption ?? '',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    alt: raw.alt ?? '',
    src: raw.src ?? '',
    // commercial items carried a type:'video' + youtubeUrl pair; keep the link
    ...(raw.youtubeUrl ? { youtubeUrl: raw.youtubeUrl } : {}),
  }
}

function migrateFilm(raw, folderId, position) {
  return {
    id: String(raw.id ?? newId()),
    folderId,
    position,
    kind: 'film',
    title: raw.title ?? '',
    caption: raw.caption ?? '',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    alt: raw.alt ?? raw.title ?? '',
    posterSrc: raw.posterSrc ?? '',
    videoUrl: raw.videoUrl ?? '',
    duration: raw.duration ?? '',
    ...(raw.year ? { year: Number(raw.year) } : {}),
    director: raw.director ?? '',
    producer: raw.producer ?? '',
    cinematographer: raw.cinematographer ?? '',
    editor: raw.editor ?? '',
    productionCompany: raw.productionCompany ?? '',
    awards: Array.isArray(raw.awards) ? raw.awards : [],
    stills: Array.isArray(raw.stills)
      ? raw.stills.map(s => ({ id: String(s.id ?? newId()), src: s.src ?? '', caption: s.caption ?? '' }))
      : [],
  }
}

async function run() {
  console.log('Reading current content…')
  const [photography, cinema, commercial] = await Promise.all([
    readSection('photography.json'),
    readSection('cinema.json'),
    readSection('commercial.json'),
  ])
  const sections = { photography, cinema, commercial }

  const folders = []
  const items = []

  ROOTS.forEach((root, rootIndex) => {
    const rootId = root.slug // stable, readable id for the three roots
    folders.push({
      id: rootId,
      name: root.name,
      slug: root.slug,
      parentId: null,
      position: rootIndex,
      visible: true,
      system: true,
    })

    const usedSlugs = new Set()
    const source = sections[root.slug]?.folders ?? []

    source.forEach((folder, folderIndex) => {
      const slug = uniqueSlug(slugify(folder.name), usedSlugs)
      usedSlugs.add(slug)
      const folderId = String(folder.id ?? newId())

      folders.push({
        id: folderId,
        name: folder.name,
        slug,
        parentId: rootId,
        position: folderIndex,
        visible: true,
      })

      const contents = folder[root.key] ?? []
      contents.forEach((raw, i) => {
        items.push(
          root.key === 'films' ? migrateFilm(raw, folderId, i) : migratePhoto(raw, folderId, i)
        )
      })
    })
  })

  const tree = { folders, items }

  console.log(
    `\nBuilt tree: ${folders.length} folders (${ROOTS.length} roots + ${folders.length - ROOTS.length} children), ${items.length} items ` +
      `(${items.filter(i => i.kind === 'photo').length} photos, ${items.filter(i => i.kind === 'film').length} films)`
  )
  for (const root of ROOTS) {
    const children = folders.filter(f => f.parentId === root.slug)
    console.log(`  ${root.name}: ${children.length} folders`)
    for (const c of children) {
      console.log(`    /${root.slug}/${c.slug} — ${items.filter(i => i.folderId === c.id).length} items`)
    }
  }

  if (DRY) {
    console.log('\n--dry: nothing written.')
    return
  }

  const seedPath = path.join(__dirname, '..', 'data', 'tree.json')
  fs.writeFileSync(seedPath, JSON.stringify(tree, null, 2))
  console.log(`\nWrote seed ${seedPath}`)

  const blob = await put(`data/tree-${Date.now()}.json`, JSON.stringify(tree, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: true,
  })
  console.log(`Wrote blob ${blob.pathname}`)
  console.log('\nOld photography/cinema/commercial blobs left in place for rollback.')
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
