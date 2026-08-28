import { loadClips } from '../utils/clips'
import { setClipItems } from '../utils/progress'
import type { Clip } from '../utils/content'
import { loadUnavailable, saveUnavailable } from '../utils/unavailable'

// One list of dead videos for the whole site, like useProgress: a module ref filled from
// localStorage as soon as the browser mounts a page that studies clips.
const unavailable = ref<string[]>([])

export function useClips(options: { load?: boolean } = {}) {
  const shouldLoad = options.load !== false
  const clips = shallowRef<Clip[]>([])
  const loading = ref(false)
  let loadPromise: Promise<void> | undefined

  async function load() {
    if (loadPromise) {
      return loadPromise
    }

    loading.value = true
    loadPromise = loadClips().then(value => {
      clips.value = value
      setClipItems(value)
      loading.value = false
    })

    return loadPromise
  }

  onMounted(() => {
    unavailable.value = loadUnavailable()

    if (shouldLoad) void load()
  })

  /** The player reported the embed is gone. Flagged, not forgotten: the attempts stay. */
  function markUnavailable(videoId: string) {
    if (unavailable.value.includes(videoId)) {
      return
    }

    unavailable.value = [...unavailable.value, videoId]
    saveUnavailable(unavailable.value)
  }

  const isPlayable = (clip: Pick<Clip, 'videoId'> | string) =>
    !unavailable.value.includes(typeof clip === 'string' ? clipVideoId(clip) : clip.videoId)

  /** What can still be studied. Empty until mounted, so the pages render it inside ClientOnly. */
  const playable = computed(() => clips.value.filter(isPlayable))

  return { clips, loading, load, playable, unavailable, isPlayable, markUnavailable }
}

function clipVideoId(itemId: string) {
  return itemId.slice('clips:'.length).split(':')[0] ?? ''
}
