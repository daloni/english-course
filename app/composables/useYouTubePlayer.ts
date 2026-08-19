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

  const attempt = new Promise<YTNamespace>((resolve, reject) => {
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
    // A failed load must not outlive the attempt: drop the cached promise and the dead
    // tag so the next caller starts a new load instead of replaying this rejection
    // until the page is reloaded.
    script.onerror = () => {
      // Only this attempt clears the cache: a late error from a script already
      // replaced must not wipe a newer, healthy load.
      if (apiPromise === attempt) apiPromise = null
      script.remove()
      reject(new Error('No se pudo cargar el reproductor de YouTube'))
    }
    document.head.appendChild(script)
  })

  apiPromise = attempt

  return attempt
}
