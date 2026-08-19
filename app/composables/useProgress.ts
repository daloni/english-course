// There is a single progress for the whole site: a module ref filled from localStorage as
// soon as the browser mounts the first page that uses it. On the server it is empty, so
// whatever depends on it is rendered inside <ClientOnly>.
const progress = ref<Progress>({})

/**
 * The same course can be open in several tabs, and each answer saves the whole object: a tab
 * that writes its own snapshot would drop whatever another one saved in the meantime. So every
 * mutation is rebased on what is stored right now, and this listener brings the writes of the
 * other tabs into this one. `storage` only fires on the tabs that did not write, which is
 * exactly the ones that need to catch up.
 */
function onStorage(event: StorageEvent) {
  // A `localStorage.clear()` arrives with a null key and takes the progress with it.
  if (event.key === storageKey || event.key === null) {
    progress.value = load()
  }
}

// One listener for the whole app instead of one per component: `useProgress` is called from
// every page that shows progress, and it goes away with the last of them.
let listening = 0

export interface Stats {
  /** Exercises that exist, practised or not. */
  total: number
  practiced: number
  hits: number
  misses: number
  /** In Leitner box 3. */
  mastered: number
  /** Practised and due for review today. */
  due: number
}

export function useProgress() {
  onMounted(() => {
    progress.value = load()

    if (listening++ === 0) {
      window.addEventListener('storage', onStorage)
    }
  })

  onUnmounted(() => {
    // Guarded because a component that never mounted still unmounts: it never added anything.
    if (listening > 0 && --listening === 0) {
      window.removeEventListener('storage', onStorage)
    }
  })

  /** Corrects an exercise and saves its updated Leitner attempt. */
  function record(id: string, correct: boolean) {
    const stored = load()

    progress.value = { ...stored, [id]: review(stored[id], id, correct) }
    save(progress.value)
  }

  function attemptOf(id: string) {
    return progress.value[id]
  }

  const attempts = computed(() => Object.values(progress.value))

  /**
   * What is due for review today, in the order it was first practised, which already mixes
   * the sections. An attempt whose content no longer exists drops out of the queue.
   */
  const pending = computed(() => attempts.value
    .filter(attempt => isDue(attempt))
    .map(attempt => itemById(attempt.id))
    .filter((item): item is Item => item !== undefined))

  /** The missed ones, from the most missed to the least. */
  const failed = computed(() => attempts.value
    .filter(attempt => attempt.misses > 0)
    .sort((a, b) => b.misses - a.misses || a.box - b.box)
    .map(attempt => ({ attempt, item: itemById(attempt.id) }))
    .filter((failure): failure is { attempt: Attempt, item: Item } => failure.item !== undefined))

  function statsOf(items: Item[]): Stats {
    const done = items.map(item => progress.value[item.id]).filter(attempt => attempt !== undefined)

    return {
      total: items.length,
      practiced: done.length,
      hits: done.reduce((sum, attempt) => sum + attempt.hits, 0),
      misses: done.reduce((sum, attempt) => sum + attempt.misses, 0),
      mastered: done.filter(attempt => attempt.box === 3).length,
      due: done.filter(attempt => isDue(attempt)).length
    }
  }

  /** Downloads progress as JSON, to carry it over to another browser. */
  function exportFile() {
    const url = URL.createObjectURL(new Blob([serialize(progress.value)], { type: 'application/json' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: `progreso-${day()}.json` })

    link.click()
    // Revoke on the next tick: Firefox and Safari start the download after the click, and
    // with the url already revoked the file comes out empty.
    setTimeout(() => URL.revokeObjectURL(url))
  }

  /** Imports an exported file. Throws if it is not one: the caller shows the error. */
  async function importFile(file: File) {
    const imported = parse(await file.text())
    // Against what is stored, not against what this tab loaded: importing does not undo the
    // answers of another tab, and `merge` already keeps the most recent attempt of each id.
    const current = load()

    progress.value = merge(current, imported)
    save(progress.value)

    return {
      imported: Object.keys(imported).length,
      added: Object.keys(imported).filter(id => !Object.hasOwn(current, id)).length
    }
  }

  /** Empties the progress of this browser, tabs included: the storage event does the rest. */
  function reset() {
    progress.value = {}
    clear()
  }

  return {
    attempts,
    pending,
    failed,
    record,
    attemptOf,
    statsOf,
    exportFile,
    importFile,
    reset
  }
}
