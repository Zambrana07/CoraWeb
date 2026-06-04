import { BrowserRouter, Route, Routes } from "react-router-dom";
import MapaHome from "./pages/MapaHome.jsx";
import ArchiveroPage from "./pages/ArchiveroPage.jsx";
import Perfil from "./pages/perfil.jsx";
import Login from "./pages/Login.jsx";
import NotFound from "./pages/NotFound.tsx";
import AgenteCoraChat from "./components/AgenteCoraChat.jsx";
import CoraTour from "./components/CoraTour.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MapaHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/archivero"
        element={
          <ProtectedRoute>
            <ArchiveroPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <Perfil />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <AgenteCoraChat />
    <CoraTour />
  </BrowserRouter>
);

export default App;
