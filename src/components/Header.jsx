import { useNavigate } from 'react-router-dom';
import '../assets/styles/Header.css';
import logo from '../assets/img/CoraLogo.png';
import adminIcon from '../assets/img/icons/file.svg';
import { getStoredUser, isAdminUser } from '../lib/authSession';

/**
 * Componente Header principal de la aplicación:
 * 
 * Se encarga de renderizar la barra superior global de navegación, mostrando la identidad de marca 
 * mediante el logotipo e integrando un control de acceso condicional basado en roles. La resolución 
 * del usuario activo prioriza la prop recibida y, como mecanismo de respaldo (fallback), consulta el 
 * estado persistido en sesión a través de `getStoredUser()`.
 * 
 * Evalúa los permisos del usuario con `isAdminUser()` para determinar la visibilidad del botón de administración. 
 * Cuando el botón está presente, utiliza el hook `useNavigate` de React Router para redirigir dinámicamente 
 * al usuario hacia la ruta del panel administrativo (`/admin`).
 */

const Header = ({ user }) => {
  const navigate = useNavigate();
  const currentUser = user || getStoredUser();
  const isAdmin = isAdminUser(currentUser);

  return (
    <header className="main-header">
      <div className="logo-container">
        <img src={logo} alt="Logo" className="logo-img" />
      </div>

      {isAdmin && (
        <button
          type="button"
          className="admin-header-btn"
          onClick={() => navigate('/admin')}
          aria-label="Ir al panel de administración"
        >
          <img src={adminIcon} alt="" className="admin-header-icon" />
          <span>Admin</span>
        </button>
      )}
    </header>
  );
};

export default Header;
