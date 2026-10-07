const fs = require('fs')
const path = require('path')

// Load BLOB_READ_WRITE_TOKEN (and friends) from .env.local without adding a dotenv dependency
const envPath = path.join(__dirname, '..', '.env.local')
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/)
  if (match) process.env[match[1]] = match[2].replace(/^"|"$/g, '')
}

const { put } = require('@vercel/blob')

async function run() {
  const files = ['photography.json', 'cinema.json', 'commercial.json']
  for (const file of files) {
    const data = require(path.join(__dirname, '..', 'data', file))
    const prefix = `data/${file.replace(/\.json$/, '')}-`
    const blob = await put(`${prefix}${Date.now()}.json`, JSON.stringify(data, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: true,
    })
    console.log('seeded', file, '->', blob.url)
  }
}
run().catch(e => { console.error(e); process.exit(1) })
