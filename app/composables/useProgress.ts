// There is a single progress for the whole site: a module ref filled from localStorage as
// soon as the browser mounts the first page that uses it. On the server it is empty, so
// whatever depends on it is rendered inside <ClientOnly>.
const progress = ref<Progress>({})

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
  })

  /** Corrects an exercise and saves: every answer moves its Leitner box. */
  function record(id: string, correct: boolean) {
    progress.value = { ...progress.value, [id]: review(progress.value[id], id, correct) }
    save(progress.value)
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
    progress.value = parse(await file.text())
    save(progress.value)
  }

  function reset() {
    progress.value = {}
    save(progress.value)
  }

  return {
    attempts,
    pending,
    failed,
    record,
    statsOf,
    exportFile,
    importFile,
    reset
  }
}
