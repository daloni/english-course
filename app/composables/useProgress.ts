// El progreso es uno solo para toda la web: un ref de módulo que se llena del localStorage
// en cuanto el navegador monta la primera página que lo usa. En el servidor está vacío, así
// que lo que dependa de él se pinta dentro de <ClientOnly>.
const progress = ref<Progress>({})

export interface Stats {
  /** Ejercicios que existen, se hayan practicado o no. */
  total: number
  practiced: number
  hits: number
  misses: number
  /** En la caja 3 de Leitner. */
  mastered: number
  /** Practicados y pendientes de repaso hoy. */
  due: number
}

export function useProgress() {
  onMounted(() => {
    progress.value = load()
  })

  /** Corrige un ejercicio y guarda: cada respuesta mueve su caja Leitner. */
  function record(id: string, correct: boolean) {
    progress.value = { ...progress.value, [id]: review(progress.value[id], id, correct) }
    save(progress.value)
  }

  const attempts = computed(() => Object.values(progress.value))

  /**
   * Lo que toca repasar hoy, en el orden en que se practicó por primera vez, que ya mezcla
   * las secciones. Un intento de contenido que ya no existe se cae de la cola.
   */
  const pending = computed(() => attempts.value
    .filter(attempt => isDue(attempt))
    .map(attempt => itemById(attempt.id))
    .filter((item): item is Item => item !== undefined))

  /** Los fallados, del que más se ha fallado al que menos. */
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

  /** Descarga el progreso como JSON, para llevárselo a otro navegador. */
  function exportFile() {
    const url = URL.createObjectURL(new Blob([serialize(progress.value)], { type: 'application/json' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: `progreso-${day()}.json` })

    link.click()
    // Revocar en el tick siguiente: Firefox y Safari arrancan la descarga después del click,
    // y con la url ya revocada el fichero sale vacío.
    setTimeout(() => URL.revokeObjectURL(url))
  }

  /** Importa un fichero exportado. Lanza si no lo es: quien llama enseña el error. */
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
