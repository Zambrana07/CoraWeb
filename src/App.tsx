import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "./pages/Index.tsx";
import ArchiveroPage from "./pages/ArchiveroPage.jsx";
import Perfil from "./pages/perfil.jsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
      <BrowserRouter>
      <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/archivero" element={<ArchiveroPage />} />
          <Route path="/perfil" element={<Perfil />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
);

export default App;
