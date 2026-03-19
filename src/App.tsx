import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import LibraryPage from './pages/Library'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
