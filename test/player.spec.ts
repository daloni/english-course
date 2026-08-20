import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import ClipPlayer from '../app/components/ClipPlayer.vue'
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
let created = 0
let destroyed = 0
let playCalls = 0

/** Stands in for the real iframe player, which needs a browser and a network. */
class FakePlayer implements YTPlayer {
  constructor(_el: HTMLElement | string, options: Record<string, unknown>) {
    created += 1
    events = options.events as PlayerEvents
  }

  playVideo() { playCalls += 1 }
  pauseVideo() {}
  seekTo() {}
  getCurrentTime() { return 0 }
  getPlayerState() { return 0 }
  loadVideoById(options: { videoId: string, startSeconds?: number, endSeconds?: number }) { loaded = options }
  destroy() { destroyed += 1 }
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

beforeEach(() => {
  events = {}
  loaded = null
  created = 0
  destroyed = 0
  playCalls = 0
  delete window.YT
  delete window.onYouTubeIframeAPIReady
  for (const script of apiScripts()) script.remove()
})

afterEach(() => vi.restoreAllMocks())

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
  // First case of the block: the component holds the real loader, and this is the only one
  // that needs it to have loaded nothing yet.
  it('offers a retry when the API script fails, and plays after it', async () => {
    const player = await mountSuspended(ClipPlayer, { props })

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
    expect(player.text()).toContain('Reproducir')
  })

  it.each([100, 101, 150])('takes the video out of rotation on error %i', async (code) => {
    installApi()

    const player = await mountSuspended(ClipPlayer, { props })
    await flushPromises()

    events.onError!({ data: code })
    await flushPromises()

    expect(player.emitted('unavailable')).toEqual([[props.videoId]])
    expect(player.text()).toContain('Este vídeo ya no está disponible')
    expect(player.text()).not.toContain('Reintentar')
  })

  it.each([2, 5])('keeps the video and reloads it on error %i', async (code) => {
    installApi()

    const player = await mountSuspended(ClipPlayer, { props })
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

  it('reuses the player and loads every part of the next clip', async () => {
    installApi()

    const player = await mountSuspended(ClipPlayer, { props })
    await flushPromises()

    events.onReady!()
    await flushPromises()
    await player.find('button').trigger('click')

    const nextProps = { videoId: 'abcdefghijk', startMs: 2500, endMs: 6500 }
    await player.setProps(nextProps)
    await flushPromises()

    expect(created).toBe(1)
    expect(destroyed).toBe(0)
    expect(loaded).toEqual({ videoId: nextProps.videoId, startSeconds: 2.5, endSeconds: 6.5 })
    expect(playCalls).toBe(2)

    loaded = null
    await player.setProps({ endMs: 7000 })
    await flushPromises()

    expect(loaded).toEqual({ videoId: nextProps.videoId, startSeconds: 2.5, endSeconds: 7 })

    await player.unmount()
    expect(destroyed).toBe(1)
  })

  it.each([100, 2])('clears the previous %i error on the next clip', async (code) => {
    installApi()

    const player = await mountSuspended(ClipPlayer, { props })
    await flushPromises()

    events.onError!({ data: code })
    await flushPromises()
    await player.setProps({ videoId: 'abcdefghijk' })
    await flushPromises()

    expect(player.text()).not.toContain('Este vídeo ya no está disponible')
    expect(player.text()).not.toContain('Comprueba tu conexión')
    expect(player.text()).toContain('Reproducir')
  })

  it('cancels the previous window when the clip changes', async () => {
    installApi()

    const cancelAnimationFrame = vi.spyOn(globalThis, 'cancelAnimationFrame')
    const player = await mountSuspended(ClipPlayer, { props })
    await flushPromises()

    events.onStateChange!({ data: fakeApi.PlayerState.PLAYING })
    await player.setProps({ videoId: 'abcdefghijk' })

    expect(cancelAnimationFrame).toHaveBeenCalled()
  })
})
