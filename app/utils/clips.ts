import type { Clip } from './content'

/** Clip JSON is split into async chunks so pages that do not study clips never load it. */
export const clipFiles = import.meta.glob<Clip[]>('../../content/clips/*.json', { import: 'default' })

let clipsPromise: Promise<Clip[]> | undefined

/** Concurrent callers share one load; a failure is not kept, so the next call tries again. */
export function loadClips() {
  return clipsPromise ??= Promise.all(Object.values(clipFiles).map(load => load()))
    .then(files => files.flat())
    .catch((failure) => {
      clipsPromise = undefined
      throw failure
    })
}

/** Drops the memoized load, so the next call downloads again. */
export function forgetClips() {
  clipsPromise = undefined
}
