import './App.css'
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

import './assets/styles/MapaHome.css'
import Header from "./components/Header"
import Footer from "./components/Footer"
import Home from "./pages/Home"
import ArchiveroPage from "./pages/ArchiveroPage"
import Perfil from "./pages/Perfil"
import Agente from "./components/AgenteCoraChat"
import NotFound from "./pages/NotFound";
import Login from './pages/Login';
import Register from './pages/Register';
import CoraTour from "./components/CoraTour";
import Informativa from "./pages/Informativa";
import AdminPanel from "./pages/AdminPanel";
import { clearStoredUser, getStoredUser, setStoredUser } from "./lib/authSession";
import SafariToolbarColor from './components/SafariColor'

/**
 * Componente Layout:
 * 
 * Es el núcleo operativo de la aplicación encargado de evaluar el contexto de navegación en cada cambio de ruta.
 * Realiza verificaciones asíncronas de sesión contra la API del backend para asegurar que la cuenta del usuario
 * continúe activa, previene el acceso no autorizado a secciones privadas y sincroniza permisos/roles en tiempo real.
 * Asimismo, determina qué elementos de la interfaz deben mostrarse u ocultarse según la ruta actual.
 */

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sessionUser, setSessionUser] = useState(() => getStoredUser());

  const hideFooter = location.pathname === "/login" || location.pathname === "/register";
  const userId = sessionUser?.id || getStoredUser()?.id;

  useEffect(() => {
    if (!userId || hideFooter) return;

    let cancelled = false;

    const verifyUserSession = async () => {
      try {
        const response = await fetch("/api/load-perfil", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: userId }),
        });
        const data = await response.json();

        if (cancelled) return;

        if (!data?.ok || !data?.perfil) {
          clearStoredUser();
          setSessionUser(null);
          navigate("/login", { replace: true });
          return;
        }

        // Mantener el rol sincronizado con la base (por si lo promovieron a admin).
        const synced = setStoredUser({
          id: data.perfil.id ?? userId,
          rol: data.perfil.rol_id,
        });
        setSessionUser(synced);
      } catch {
        return;
      }
    };

    verifyUserSession();
    return () => {
      cancelled = true;
    };
  }, [userId, hideFooter, navigate, location.pathname]);

    /* Guarda de Autenticación (protección rutas privadas):
    * Condicional de seguridad inmediata: Si un usuario no autenticado intenta navegar a una ruta protegida
    * (cualquiera que no sea /login o /register), el componente interrumpe el renderizado normal y ejecuta
    * una redirección con sustitución de historial hacia la pantalla de inicio de sesión.
    */

  if (!userId && !hideFooter) {
    return <Navigate to="/login" replace />;
  }
  
    /* Renderizado de la Estructura Visual:
    *
    * Renderiza el encabezado global, ajusta el color de la barra del navegador para dispositivos, define 
    * las rutas mapeadas del sistema y monta condicionalmente los componentes flotantes y el pie de página.
    */

  return (
    <>
      <Header user={sessionUser || getStoredUser()} />
      <SafariToolbarColor color="#04504F"/>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/archivero" element={<ArchiveroPage />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/login" element={<Login />} />
        {/* <Route path="/register" element={<Register />} />. This is for Public Registration */}
        <Route path="/informativa" element={<Informativa />} />
        <Route path="/admin" element={<AdminPanel />} />
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

  /**
   * Componente Raíz:
   * 
   * Constituye el nivel superior de la jerarquía de React en este archivo.
   * Su propósito principal es proveer el contexto de enrutamiento mediante el contenedor 'BrowserRouter',
   * asegurando que todos los hooks de navegación ('useLocation', 'useNavigate') y elementos de ruta
   * declarados dentro de 'Layout' dispongan del estado y la API del historial del navegador.
   */

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;