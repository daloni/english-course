import type { Clip } from '../../app/utils/content'

export const clipFiles = import.meta.glob<Clip[]>('../../content/clips/*.json', { eager: true, import: 'default' })
export const clips: Clip[] = Object.values(clipFiles).flat()
