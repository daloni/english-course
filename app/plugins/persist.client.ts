/**
 * Asks the browser not to evict the storage.
 *
 * localStorage is best-effort by default: under disk pressure a browser may clear it for sites
 * it considers disposable. Here it holds the only copy of the progress —there is no account and
 * no backend— so the durable tier is worth asking for. An installed PWA is usually granted it
 * without a prompt; if it is refused there is nothing to do but the export of /progreso.
 */
export default defineNuxtPlugin(() => {
  navigator.storage?.persist?.().catch(() => {})
})
