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

  if (!userId && !hideFooter) {
    return <Navigate to="/login" replace />;
  }

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

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;
