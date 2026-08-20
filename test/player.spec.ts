import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { YTPlayer } from '../app/composables/useYouTubePlayer'

// Guards the two ways playing a clip can go wrong. A video that no longer exists is gone for
// good and leaves the rotation; a network that dropped is not the video's fault and has to be
// retryable, both in the API loader and in what the player tells the user.

const scriptSelector = 'script[src*="youtube.com/iframe_api"]'

const apiScripts = () => document.querySelectorAll<HTMLScriptElement>(scriptSelector)

/** The events the component wired into the last player it built. */
interface PlayerEvents {
  onReady?: () => void
  onStateChange?: (e: { data: number }) => void
  onError?: (e: { data: number }) => void
}

let events: PlayerEvents = {}
let loaded: { videoId: string, startSeconds?: number, endSeconds?: number } | null = null
let playerCreated = 0
let playCalls = 0

/** Stands in for the real iframe player, which needs a browser and a network. */
class FakePlayer implements YTPlayer {
  constructor(_el: HTMLElement | string, options: Record<string, unknown>) {
    playerCreated++
    events = options.events as PlayerEvents
  }

  playVideo() { playCalls++ }
  pauseVideo() {}
  seekTo() {}
  getCurrentTime() { return 0 }
  getPlayerState() { return 0 }
  loadVideoById(options: { videoId: string, startSeconds?: number, endSeconds?: number }) { loaded = options }
  destroy() {}
  mute() {}
  unMute() {}
}

// One namespace object for the whole file: the loader caches whatever it resolved with, so a
// later test has to keep talking to the same fake.
const fakeApi = {
  Player: FakePlayer,
  PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 }
}

function installApi() {
  window.YT = fakeApi
}

/** Fails the pending load the way a dropped network does. */
function failScript() {
  const script = apiScripts()[0]

  expect(script, 'the loader has to have injected a script to fail').toBeDefined()
  script!.dispatchEvent(new Event('error'))
}

const props = { videoId: 'dQw4w9WgXcQ', startMs: 1000, endMs: 4000 }

async function freshComponent() {
  vi.resetModules()

  return (await import('../app/components/ClipPlayer.vue')).default
}

beforeEach(() => {
  events = {}
  loaded = null
  playerCreated = 0
  playCalls = 0
  delete window.YT
  delete window.onYouTubeIframeAPIReady
  for (const script of apiScripts()) script.remove()
})

describe('useYouTubeApi', () => {
  // The loader is a page-wide singleton on purpose, so each case takes a fresh copy of the
  // module instead of inheriting the state the previous one left behind.
  async function freshLoader() {
    vi.resetModules()

    return (await import('../app/composables/useYouTubePlayer')).useYouTubeApi
  }

  it('shares one script and one promise while a load is in flight', async () => {
    const useYouTubeApi = await freshLoader()
    const pending = useYouTubeApi()

    expect(useYouTubeApi()).toBe(pending)
    expect(apiScripts()).toHaveLength(1)

    failScript()
    await expect(pending).rejects.toThrow()
  })

  it('starts a new load after a failed one instead of replaying the rejection', async () => {
    const useYouTubeApi = await freshLoader()
    const first = useYouTubeApi()

    failScript()

    await expect(first).rejects.toThrow('No se pudo cargar el reproductor de YouTube')
    // The dead tag goes with the promise, or the next attempt would find it and wait forever.
    expect(apiScripts()).toHaveLength(0)

    const second = useYouTubeApi()

    expect(second).not.toBe(first)
    expect(apiScripts()).toHaveLength(1)

    installApi()
    window.onYouTubeIframeAPIReady!()

    await expect(second).resolves.toBe(fakeApi)
  })
})

describe('ClipPlayer', () => {
  it('does not load YouTube until the user asks to play', async () => {
    const ClipPlayer = await freshComponent()
    const player = await mountSuspended(ClipPlayer, { props })

    expect(apiScripts()).toHaveLength(0)
    expect(player.find('iframe').exists()).toBe(false)
    expect(player.text()).toContain('se conectará con YouTube')
    expect(player.find('button').text()).toContain('Reproducir')

    await player.find('button').trigger('click')
    expect(apiScripts()).toHaveLength(1)

    installApi()
    window.onYouTubeIframeAPIReady!()
    await flushPromises()
    expect(playerCreated).toBe(1)

    events.onReady!()
    expect(playCalls).toBe(1)
  })

  it('offers a retry when the API script fails, and plays after it', async () => {
    const ClipPlayer = await freshComponent()
    const player = await mountSuspended(ClipPlayer, { props })

    await player.find('button').trigger('click')
    failScript()
    await flushPromises()

    expect(player.emitted('unavailable'), 'a network failure says nothing about the video').toBeUndefined()
    expect(player.text()).not.toContain('Se excluirá')
    expect(player.text()).toContain('Comprueba tu conexión')

    installApi()
    await player.find('button').trigger('click')
    await flushPromises()

    events.onReady!()
    await flushPromises()

    expect(player.text()).not.toContain('Comprueba tu conexión')
    expect(playCalls).toBe(1)
  })

  it.each([100, 101, 150])('takes the video out of rotation on error %i', async (code) => {
    const ClipPlayer = await freshComponent()
    installApi()

    const player = await mountSuspended(ClipPlayer, { props })
    await player.find('button').trigger('click')
    await flushPromises()

    events.onError!({ data: code })
    await flushPromises()

    expect(player.emitted('unavailable')).toEqual([[props.videoId]])
    expect(player.text()).toContain('Este vídeo ya no está disponible')
    expect(player.text()).not.toContain('Reintentar')
  })

  it.each([2, 5])('keeps the video and reloads it on error %i', async (code) => {
    const ClipPlayer = await freshComponent()
    installApi()

    const player = await mountSuspended(ClipPlayer, { props })
    await player.find('button').trigger('click')
    await flushPromises()

    events.onError!({ data: code })
    await flushPromises()

    expect(player.emitted('unavailable'), 'a transient error excludes nothing').toBeUndefined()
    expect(player.text()).not.toContain('Se excluirá')
    expect(player.text()).toContain('Comprueba tu conexión')

    await player.find('button').trigger('click')
    await flushPromises()

    expect(loaded).toEqual({ videoId: props.videoId, startSeconds: 1, endSeconds: 4 })
    expect(player.text()).not.toContain('Comprueba tu conexión')
  })
})
