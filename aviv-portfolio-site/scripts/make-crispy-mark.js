const sharp = require('sharp')
const path = require('path')

async function run() {
  const input = path.join(__dirname, '..', 'public', 'crispy.jpg')
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const out = Buffer.from(data)
  for (let i = 0; i < width * height; i++) {
    const idx = i * channels
    const r = data[idx], g = data[idx + 1], b = data[idx + 2]
    const brightness = (r + g + b) / 3
    const alpha = Math.max(0, Math.min(255, Math.round(255 - brightness)))
    out[idx] = 10
    out[idx + 1] = 10
    out[idx + 2] = 10
    out[idx + 3] = alpha
  }
  await sharp(out, { raw: { width, height, channels } })
    .png()
    .trim({ threshold: 5 })
    .toFile(path.join(__dirname, '..', 'public', 'crispy-mark.png'))
  console.log('done')
}
run().catch(e => { console.error(e); process.exit(1) })
