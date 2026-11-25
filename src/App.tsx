import { Link, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { getToken, setToken } from './api'
import AdminHome from './pages/AdminHome'
import AdminLogin from './pages/AdminLogin'
import AdminPuzzle from './pages/AdminPuzzle'
import Archive from './pages/Archive'
import Puzzle from './pages/Puzzle'
import Today from './pages/Today'
import MangaBackdrop from './components/MangaBackdrop'

const LANDING_URL: string = import.meta.env.VITE_LANDING_URL || '/'

function Layout() {
  const { pathname } = useLocation()
  return (
    <>
      <a href="#main" className="skip">Aller au contenu</a>
      <header className="top">
        <a href={LANDING_URL} className="logo" aria-label="Koma, accueil">
          <span>K</span>OMA
        </a>
        <nav aria-label="Navigation principale">
          <NavLink to="/" end>Jouer</NavLink>
          <NavLink to="/archive">Archives</NavLink>
        </nav>
      </header>
      <main id="main" className="wrap stage">
        <MangaBackdrop />
        <div className="page-in" key={pathname}>
          <Outlet />
        </div>
      </main>
      <footer className="foot">Les images appartiennent à leurs auteurs. Retrait sur demande.</footer>
    </>
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
        <Route index element={<Today />} />
        <Route path="p/:number" element={<Puzzle />} />
        <Route path="archive" element={<Archive />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="admin" element={<AdminLayout />}>
        <Route path="login" element={<AdminLogin />} />
        <Route index element={<AdminHome />} />
        <Route path="puzzles/:id" element={<AdminPuzzle />} />
      </Route>
    </Routes>
  )
}
