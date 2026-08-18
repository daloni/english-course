// One list of dead videos for the whole site, like useProgress: a module ref filled from
// localStorage as soon as the browser mounts a page that studies clips.
const unavailable = ref<string[]>([])

export function useClips() {
  onMounted(() => {
    unavailable.value = loadUnavailable()
  })

  /** The player reported the embed is gone. Flagged, not forgotten: the attempts stay. */
  function markUnavailable(videoId: string) {
    if (unavailable.value.includes(videoId)) {
      return
    }

    unavailable.value = [...unavailable.value, videoId]
    saveUnavailable(unavailable.value)
  }

  const isPlayable = (clip: Clip) => !unavailable.value.includes(clip.videoId)

  /** What can still be studied. Empty until mounted, so the pages render it inside ClientOnly. */
  const playable = computed(() => clips.filter(isPlayable))

  return { unavailable, playable, isPlayable, markUnavailable }
}
