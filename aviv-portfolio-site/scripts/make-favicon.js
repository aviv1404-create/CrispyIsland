const sharp = require('sharp')
const path = require('path')

async function run() {
  const markPath = path.join(__dirname, '..', 'public', 'crispy-mark.png')
  const size = 512
  const padding = 0.16

  const meta = await sharp(markPath).metadata()
  const innerSize = Math.round(size * (1 - padding * 2))
  const scale = Math.min(innerSize / meta.width, innerSize / meta.height)
  const resizedW = Math.round(meta.width * scale)
  const resizedH = Math.round(meta.height * scale)

  const resizedMark = await sharp(markPath)
    .resize(resizedW, resizedH)
    .toBuffer()

  // Rounded-square silver backing so the mark stays visible on dark browser tabs too
  const radius = size * 0.22
  const roundedRectSvg = Buffer.from(
    `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#c9c9c9"/></svg>`
  )

  await sharp(roundedRectSvg)
    .composite([{ input: resizedMark, gravity: 'center' }])
    .png()
    .toFile(path.join(__dirname, '..', 'app', 'icon.png'))

  console.log('done', resizedW, resizedH)
}
run().catch(e => { console.error(e); process.exit(1) })
