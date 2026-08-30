import type { Clip } from './content'

/** Clip JSON is split into async chunks so pages that do not study clips never load it. */
export const clipFiles = import.meta.glob<Clip[]>('../../content/clips/*.json', { import: 'default' })

let clipsPromise: Promise<Clip[]> | undefined

export function loadClips() {
  return clipsPromise ??= Promise.all(Object.values(clipFiles).map(load => load())).then(files => files.flat())
}
