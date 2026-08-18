<script setup lang="ts">
import { useYouTubeApi, type YTPlayer } from '~/composables/useYouTubePlayer'

const props = withDefaults(defineProps<{
  videoId: string
  startMs: number
  endMs: number
  loop?: boolean
}>(), { loop: true })

const emit = defineEmits<{ unavailable: [videoId: string] }>()

const host = useTemplateRef<HTMLDivElement>('host')
const player = shallowRef<YTPlayer | null>(null)
const started = ref(false)
const failed = ref(false)
const loading = ref(true)

let rafId = 0

const startS = computed(() => props.startMs / 1000)
const endS = computed(() => props.endMs / 1000)

/**
 * Keep the clip inside its window by polling.
 *
 * The player's own `end` parameter is not reliable for tight loops — it
 * overshoots by a variable margin and, once it stops, will not resume without
 * a reload. Polling getCurrentTime() is the only way to get a clean cut, so
 * `end` is passed too but only as a backstop.
 */
function watchWindow() {
  cancelAnimationFrame(rafId)
  const tick = () => {
    const p = player.value
    if (p) {
      const t = p.getCurrentTime()
      if (t >= endS.value) {
        if (props.loop) {
          p.seekTo(startS.value, true)
        } else {
          p.pauseVideo()
          rafId = 0
          return
        }
      }
      // A seek before the clip (user scrubbing) snaps back to its start.
      if (t < startS.value - 0.5) p.seekTo(startS.value, true)
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

async function mount() {
  if (!host.value) return
  try {
    const YT = await useYouTubeApi()
    player.value = new YT.Player(host.value, {
      videoId: props.videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        start: Math.floor(startS.value),
        end: Math.ceil(endS.value),
        controls: 0,
        rel: 0,
        modestbranding: 1,
        cc_load_policy: 0,
        disablekb: 1,
        playsinline: 1,
        iv_load_policy: 3
      },
      events: {
        onReady: () => {
          loading.value = false
        },
        onStateChange: (e: { data: number }) => {
          if (e.data === YT.PlayerState.PLAYING) watchWindow()
        },
        onError: () => {
          // 100/101/150: removed, private or embedding disabled. The clip is
          // dead for good, so tell the parent to take it out of rotation.
          failed.value = true
          loading.value = false
          emit('unavailable', props.videoId)
        }
      }
    })
  } catch {
    failed.value = true
    loading.value = false
  }
}

/** Mobile blocks autoplay without a gesture, so the first tap starts it. */
function play() {
  started.value = true
  const p = player.value
  if (!p) return
  p.seekTo(startS.value, true)
  p.playVideo()
}

function replay() {
  const p = player.value
  if (!p) return
  p.seekTo(startS.value, true)
  p.playVideo()
}

defineExpose({ replay })

onMounted(mount)

// Reusing the iframe across cards is much faster than tearing it down, and it
// keeps the user's single "play" gesture alive for the whole session.
watch(() => [props.videoId, props.startMs], () => {
  const p = player.value
  if (!p) return
  cancelAnimationFrame(rafId)
  failed.value = false
  p.loadVideoById({ videoId: props.videoId, startSeconds: startS.value, endSeconds: endS.value })
  if (started.value) p.playVideo()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  player.value?.destroy()
})
</script>

<template>
  <div class="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
    <div
      ref="host"
      class="size-full"
    />

    <div
      v-if="!started || failed || loading"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-center"
    >
      <template v-if="failed">
        <UIcon
          name="i-lucide-video-off"
          class="size-8 text-neutral-400"
        />
        <p class="px-6 text-sm text-neutral-400">
          Este vídeo ya no está disponible. Se excluirá del repaso.
        </p>
      </template>
      <template v-else-if="loading">
        <UIcon
          name="i-lucide-loader-circle"
          class="size-8 animate-spin text-neutral-500"
        />
      </template>
      <template v-else>
        <UButton
          icon="i-lucide-play"
          size="xl"
          color="neutral"
          variant="solid"
          @click="play"
        >
          Reproducir
        </UButton>
      </template>
    </div>
  </div>
</template>
