import { useLibraryStore } from '../store'
import { THEMES, getLabels } from '../themes'
import type { TrackLayout, ThemeLabels } from '../themes'

export type { TrackLayout, ThemeLabels }

export function useTheme() {
  const theme = useLibraryStore(s => s.theme)
  const def = THEMES.find(t => t.id === theme)
  const trackLayout: TrackLayout = def?.trackLayout ?? 'rows'
  return { theme, trackLayout }
}

export function useThemeLabels(): ThemeLabels {
  const theme = useLibraryStore(s => s.theme)
  return getLabels(theme)
}
