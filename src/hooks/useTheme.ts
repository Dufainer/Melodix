import { useLibraryStore } from '../store'
import { THEMES } from '../themes'
import type { TrackLayout } from '../themes'

export type { TrackLayout }

export function useTheme() {
  const theme = useLibraryStore(s => s.theme)
  const def = THEMES.find(t => t.id === theme)
  const trackLayout: TrackLayout = def?.trackLayout ?? 'rows'
  return { theme, trackLayout }
}
