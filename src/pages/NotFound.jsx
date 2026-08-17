/**
 * NotFound.jsx — se muestra cuando la URL no coincide con ninguna ruta de App.jsx.
 * Escribe la ruta en la consola (útil al depurar enlaces rotos)
 * y ofrece un enlace de vuelta al mapa.
 */
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="notfound">
      <div className="notfound-inner">
        <h1 className="title nature-title">404</h1>
        <p className="subtitle">Oops! Page not found</p>
        <a href="/" className="primary-link">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
