import { HashRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
import Wizard from './pages/Wizard'
import Editor from './pages/Editor'
import Deploy from './pages/Deploy'
import Templates from './pages/Templates'
import Settings from './pages/Settings'
import CloneSite from './pages/CloneSite'

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/wizard" element={<Wizard />} />
          <Route path="/clone" element={<CloneSite />} />
          <Route path="/editor/:id" element={<Editor />} />
          <Route path="/deploy/:id" element={<Deploy />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
