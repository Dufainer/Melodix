import { useLibraryStore } from '../store'
import { getLabels } from '../themes'
import type { ThemeLabels } from '../themes'

export type { ThemeLabels }

export function useThemeLabels(): ThemeLabels {
  const theme = useLibraryStore(s => s.theme)
  return getLabels(theme)
}
