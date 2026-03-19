import Toolbar from '../components/Toolbar'
import LibraryList from '../components/Library'
import Editor from '../components/Editor'
import BulkEditor from '../components/BulkEditor'
import { useLibraryStore } from '../store'

export default function LibraryPage() {
  const selectedTrack = useLibraryStore((s) => s.selectedTrack)
  const selectedPaths = useLibraryStore((s) => s.selectedPaths)

  const showBulk   = selectedPaths.length > 0
  const showEditor = !showBulk && !!selectedTrack
  const showPanel  = showBulk || showEditor

  return (
    <div className="flex flex-col h-full">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <main className={`flex-1 overflow-hidden transition-all duration-300 ${showPanel ? 'mr-[340px]' : ''}`}>
          <LibraryList />
        </main>
        {showPanel && (
          <div className="fixed right-0 top-0 h-full w-[340px] border-l border-white/5 bg-surface flex flex-col z-10">
            {showBulk ? <BulkEditor /> : <Editor />}
          </div>
        )}
      </div>
    </div>
  )
}
