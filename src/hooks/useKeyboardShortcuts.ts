import { useEffect } from 'react'
import { useLibraryStore } from '../store'

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement
  return (
    t.tagName === 'INPUT' ||
    t.tagName === 'TEXTAREA' ||
    t.isContentEditable
  )
}

export function useKeyboardShortcuts() {
  const playerTrack  = useLibraryStore(s => s.playerTrack)
  const isPlaying    = useLibraryStore(s => s.isPlaying)
  const setIsPlaying = useLibraryStore(s => s.setIsPlaying)
  const playNext     = useLibraryStore(s => s.playNext)
  const playPrev     = useLibraryStore(s => s.playPrev)
  const toggleLike   = useLibraryStore(s => s.toggleLike)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (isTyping(e)) return
      // Ignore when a modifier key is held (avoid conflicting with browser/OS shortcuts)
      if (e.ctrlKey || e.metaKey || e.altKey) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (playerTrack) setIsPlaying(!isPlaying)
          break
        case 'ArrowRight':
          e.preventDefault()
          playNext()
          break
        case 'ArrowLeft':
          e.preventDefault()
          playPrev()
          break
        case 'l':
        case 'L':
          if (playerTrack) toggleLike(playerTrack.path)
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [playerTrack, isPlaying, setIsPlaying, playNext, playPrev, toggleLike])
}
