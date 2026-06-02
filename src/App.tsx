import { BrowserRouter, Route, Routes } from "react-router-dom";
import MapaHome from "./pages/MapaHome.jsx";
import ArchiveroPage from "./pages/ArchiveroPage.jsx";
import Perfil from "./pages/perfil.jsx";
import NotFound from "./pages/NotFound.jsx";
import AgenteCoraChat from "./components/AgenteCoraChat.jsx";
import CoraTour from "./components/CoraTour.jsx";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<MapaHome />} />
      <Route path="/archivero" element={<ArchiveroPage />} />
      <Route path="/perfil" element={<Perfil />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <AgenteCoraChat />
    <CoraTour />
  </BrowserRouter>
);

export default App;
