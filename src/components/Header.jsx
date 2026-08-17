/**
 * Header.jsx — barra superior fija de CoraWeb.
 * Solo muestra el logo. El color teal (#04504F) está en Header.css.
 * Es sticky para que quede visible encima del mapa al hacer scroll.
 */
import '../assets/styles/Header.css';
import logo from '../assets/img/CoraLogo.png'; 

const Header = () => {  
  return (
    <header className="main-header">
      <div className="logo-container">
        <img src={logo} alt="Logo" className="logo-img" />
      </div>
    </header>
  );
};

export default Header;
