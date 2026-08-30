import { ref } from 'vue'
import type { Clip } from './content'

// Videos that no longer play: deleted, made private or with embedding turned off. The player
// finds out only when it tries, so what it learns is kept here instead of asking again on every
// round. It is the one thing outside `ingles:progress`, and it is not progress: it is a fact
// about the video, and it must not travel in the exported backup.
export const unavailableKey = 'ingles:clips-unavailable'
export const unavailable = ref<string[]>([])

/** Without a readable localStorage (prerender, blocked storage, a test with no DOM), none. */
export function loadUnavailable(): string[] {
  try {
    const stored = typeof localStorage === 'undefined' ? null : localStorage.getItem(unavailableKey)
    const parsed: unknown = stored ? JSON.parse(stored) : []

    return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : []
  } catch {
    // A corrupt list cannot hide every clip: start over with none flagged.
    return []
  }
}

export function saveUnavailable(videoIds: string[]) {
  try {
    if (typeof localStorage === 'undefined') {
      return
    }

    localStorage.setItem(unavailableKey, JSON.stringify(videoIds))
  } catch {
    // Nowhere to store it: the dead video comes back next session, which is survivable.
  }
}

/** Makes every clip playable again and removes the device-only list. */
export function clearUnavailable() {
  unavailable.value = []

  try {
    if (typeof localStorage === 'undefined') {
      return
    }

    localStorage.removeItem(unavailableKey)
  } catch {
    // Storage blocked: the in-memory list is still restored for this session.
  }
}

export const isPlayable = (clip: Pick<Clip, 'videoId'> | string) =>
  !unavailable.value.includes(typeof clip === 'string' ? clip.slice('clips:'.length).split(':')[0] ?? '' : clip.videoId)
