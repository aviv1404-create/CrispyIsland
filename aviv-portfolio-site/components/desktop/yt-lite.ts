/**
 * A tiny stand-in for the YouTube IFrame API, used only when the official
 * script (youtube.com/iframe_api) can't load — blocked by an ad blocker, a
 * privacy extension, or a page host that only allows its own scripts. It
 * talks to a plain YouTube embed through postMessage, which is the same
 * protocol the official script uses under the hood.
 */

type Events = {
  onReady?: () => void
  onStateChange?: (e: { data: number }) => void
  onError?: (e: { data: number }) => void
}

export class LitePlayer {
  private iframe: HTMLIFrameElement
  private host: string
  private ready = false
  private state = -1
  private cur = 0
  private dur = 0
  private data: { title?: string; author?: string } = {}
  private list: string[] | null = null
  private listIndex = -1
  private handshake: ReturnType<typeof setInterval> | null = null
  private onMessage: (e: MessageEvent) => void

  constructor(el: HTMLElement, opts: { host?: string; videoId: string; playerVars?: Record<string, string | number>; events?: Events }) {
    this.host = opts.host ?? 'https://www.youtube-nocookie.com'
    const events = opts.events ?? {}
    const iframe = document.createElement('iframe')
    iframe.src = this.url(opts.videoId, opts.playerVars)
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture'
    iframe.title = 'YouTube video'
    iframe.style.cssText = 'width:100%;height:100%;border:0;display:block'
    el.replaceWith(iframe)
    this.iframe = iframe

    this.onMessage = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return
      let msg: { event?: string; info?: unknown }
      try {
        msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
      } catch {
        return
      }
      if (msg.event === 'onReady' && !this.ready) {
        this.ready = true
        this.stopHandshake()
        events.onReady?.()
      } else if (msg.event === 'onStateChange' && typeof msg.info === 'number') {
        this.setState(msg.info, events)
      } else if (msg.event === 'onError') {
        events.onError?.({ data: Number(msg.info) || 0 })
      } else if (msg.event === 'infoDelivery' && msg.info && typeof msg.info === 'object') {
        const info = msg.info as Record<string, unknown>
        if (typeof info.currentTime === 'number') this.cur = info.currentTime
        if (typeof info.duration === 'number') this.dur = info.duration
        if (info.videoData && typeof info.videoData === 'object') this.data = info.videoData as typeof this.data
        if (Array.isArray(info.playlist)) this.list = info.playlist as string[]
        if (typeof info.playlistIndex === 'number') this.listIndex = info.playlistIndex
        if (typeof info.playerState === 'number') this.setState(info.playerState, events)
      }
    }
    window.addEventListener('message', this.onMessage)
    // The embed only starts talking once it hears "listening" from us.
    const listen = () => this.post({ event: 'listening', id: 1, channel: 'widget' })
    iframe.addEventListener('load', listen)
    this.handshake = setInterval(listen, 300)
  }

  private url(id: string, vars: Record<string, string | number> = {}) {
    const q = new URLSearchParams({ enablejsapi: '1', ...Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v)])) })
    const origin = window.location.origin
    if (origin && origin !== 'null') q.set('origin', origin)
    return `${this.host}/embed/${encodeURIComponent(id)}?${q}`
  }

  private setState(s: number, events: Events) {
    if (s === this.state) return
    this.state = s
    events.onStateChange?.({ data: s })
  }

  private stopHandshake() {
    if (this.handshake) clearInterval(this.handshake)
    this.handshake = null
  }

  private post(msg: object) {
    this.iframe.contentWindow?.postMessage(JSON.stringify(msg), '*')
  }

  private cmd(func: string, args: unknown[] = []) {
    this.post({ event: 'command', func, args, id: 1, channel: 'widget' })
  }

  playVideo() { this.cmd('playVideo') }
  pauseVideo() { this.cmd('pauseVideo') }
  stopVideo() { this.cmd('stopVideo') }
  loadVideoById(id: string) { this.cur = 0; this.dur = 0; this.data = {}; this.state = -1; this.cmd('loadVideoById', [id]) }
  cueVideoById(id: string) { this.cmd('cueVideoById', [id]) }
  loadPlaylist(opts: { list: string; listType?: string; index?: number }) { this.state = -1; this.cmd('loadPlaylist', [opts]) }
  nextVideo() { this.state = -1; this.cmd('nextVideo') }
  previousVideo() { this.state = -1; this.cmd('previousVideo') }
  getPlaylist() { return this.list }
  getPlaylistIndex() { return this.listIndex }
  mute() { this.cmd('mute') }
  unMute() { this.cmd('unMute') }
  setVolume(v: number) { this.cmd('setVolume', [v]) }
  seekTo(s: number, allowSeekAhead: boolean) { this.cur = s; this.cmd('seekTo', [s, allowSeekAhead]) }
  getCurrentTime() { return this.cur }
  getDuration() { return this.dur }
  getVideoData() { return this.data }
  destroy() {
    this.stopHandshake()
    window.removeEventListener('message', this.onMessage)
    this.iframe.remove()
  }
}
