/**
 * App.jsx — esqueleto de la aplicación: rutas, sesión y chrome (header/footer/chat).
 *
 * Cómo funciona, paso a paso:
 *  1. App envuelve todo en BrowserRouter (hace falta para useLocation y Navigate).
 *  2. Layout mira localStorage.user. Si no hay id y no estás en /login,
 *     te manda al login. Esa es la "puerta" de la app.
 *  3. Siempre pinta el Header y la ruta actual.
 *  4. En páginas internas también pinta Footer, el chat AgenteCora y el tutorial.
 */
import './App.css'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'

import './assets/styles/MapaHome.css'
import Header from "./components/Header"
import Footer from "./components/Footer"
import Home from "./pages/Home"
import ArchiveroPage from "./pages/ArchiveroPage"
import Perfil from "./pages/Perfil"
import Agente from "./components/AgenteCoraChat"
import NotFound from "./pages/NotFound";
import Login from './pages/Login';
import CoraTour from "./components/CoraTour";
import Informativa from "./pages/Informativa";

function Layout() {
  const location = useLocation();

  // En login no se muestra el menú de abajo ni el chat flotante.
  const hideFooter = location.pathname === "/login";
  // La sesión es un JSON { id, rol } guardado al iniciar sesión.
  const user = JSON.parse(localStorage.getItem("user") || "null")?.id;

  // Visitante sin cuenta: solo puede ver /login.
  if (!user && !hideFooter) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Header />

      {/* Cada path muestra una página. "*" es el 404. */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/archivero" element={<ArchiveroPage />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/login" element={<Login />} />
        <Route path="/informativa" element={<Informativa />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {!hideFooter && (
        <>
          <Footer />
          <Agente />
          <CoraTour />
        </>
      )}
    </>
  );
}

// BrowserRouter tiene que estar por fuera de Layout para que useLocation funcione.
function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;
