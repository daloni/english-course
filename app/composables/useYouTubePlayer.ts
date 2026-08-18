/**
 * Loader for the YouTube IFrame Player API.
 *
 * The API script installs a single global callback and can only be loaded
 * once per page, so every ClipPlayer instance shares this one promise.
 */

export interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getPlayerState: () => number
  loadVideoById: (options: { videoId: string, startSeconds?: number, endSeconds?: number }) => void
  destroy: () => void
  mute: () => void
  unMute: () => void
}

interface YTNamespace {
  Player: new (el: HTMLElement | string, options: Record<string, unknown>) => YTPlayer
  PlayerState: { ENDED: number, PLAYING: number, PAUSED: number, BUFFERING: number, CUED: number }
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YTNamespace> | null = null

export function useYouTubeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise

  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    if (import.meta.server) return reject(new Error('YouTube IFrame API is browser-only'))
    if (window.YT?.Player) return resolve(window.YT)

    // Chain rather than overwrite: another script may already be waiting.
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT!)
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src*="youtube.com/iframe_api"]')
    if (existing) return

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => reject(new Error('No se pudo cargar el reproductor de YouTube'))
    document.head.appendChild(script)
  })

  return apiPromise
}
