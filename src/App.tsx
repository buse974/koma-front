import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { getToken, setToken } from './api'
import AdminHome from './pages/AdminHome'
import AdminLogin from './pages/AdminLogin'
import AdminMangas from './pages/AdminMangas'
import AdminPuzzle from './pages/AdminPuzzle'
import Archive from './pages/Archive'
import Home from './pages/Home'
import Puzzle from './pages/Puzzle'
import MangaBackdrop from './components/MangaBackdrop'
import PuzzleSidebar from './components/PuzzleSidebar'
import { PuzzleListProvider } from './puzzleList'

const LANDING_URL: string = import.meta.env.VITE_LANDING_URL || '/'

function Layout() {
  const { pathname } = useLocation()
  // tiroir mobile : ouvert pour une page donnée, donc refermé à chaque navigation
  const [drawerFor, setDrawerFor] = useState<string | null>(null)
  const drawer = drawerFor === pathname
  const setDrawer = (open: boolean | ((d: boolean) => boolean)) =>
    setDrawerFor(((typeof open === 'function' ? open(drawer) : open) ? pathname : null))
  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerFor(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer])

  return (
    <PuzzleListProvider>
      <a href="#main" className="skip">Aller au contenu</a>
      <header className="top">
        <a href={LANDING_URL} className="logo" aria-label="Koma, accueil">
          <span>K</span>OMA
        </a>
        <nav aria-label="Navigation principale">
          <button
            type="button"
            className="linklike side-toggle"
            aria-expanded={drawer}
            aria-controls="sidebar"
            onClick={() => setDrawer((d) => !d)}
          >
            Puzzles
          </button>
          <NavLink to="/" end>Jouer</NavLink>
          <NavLink to="/archive">Archives</NavLink>
        </nav>
      </header>
      <div className="shell">
        <aside id="sidebar" className={`sidebar${drawer ? ' is-open' : ''}`}>
          <button type="button" className="side-close" onClick={() => setDrawer(false)} aria-label="Fermer la liste des puzzles">
            ✕
          </button>
          <PuzzleSidebar onNavigate={() => setDrawer(false)} />
        </aside>
        {drawer && <div className="side-scrim" aria-hidden="true" onClick={() => setDrawer(false)} />}
        <main id="main" className="wrap stage">
          <MangaBackdrop />
          <div className="page-in" key={pathname}>
            <Outlet />
          </div>
        </main>
      </div>
      <footer className="foot">Les images appartiennent à leurs auteurs. Retrait sur demande.</footer>
    </PuzzleListProvider>
  )
}

function AdminLayout() {
  const authed = !!getToken()
  return (
    <>
      <header className="top top-admin">
        <Link to="/admin" className="logo"><span>K</span>OMA <small>admin</small></Link>
        <nav aria-label="Navigation admin">
          <NavLink to="/admin" end>Puzzles</NavLink>
          <NavLink to="/admin/mangas">Mangas</NavLink>
          <Link to="/">Voir le jeu</Link>
          {authed && (
            <button
              type="button"
              className="linklike"
              onClick={() => {
                setToken(null)
                window.location.assign('/admin/login')
              }}
            >
              Sortir
            </button>
          )}
        </nav>
      </header>
      <main id="main" className="wrap wrap-wide">
        <Outlet />
      </main>
    </>
  )
}

function NotFound() {
  return (
    <div className="empty">
      <h1 className="display">404</h1>
      <p>Cette page n’existe pas.</p>
      <Link to="/" className="btn btn-ink">Retour au jeu</Link>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="p/:id" element={<Puzzle />} />
        <Route path="archive" element={<Archive />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="admin" element={<AdminLayout />}>
        <Route path="login" element={<AdminLogin />} />
        <Route index element={<AdminHome />} />
        <Route path="mangas" element={<AdminMangas />} />
        <Route path="puzzles/:id" element={<AdminPuzzle />} />
      </Route>
    </Routes>
  )
}
