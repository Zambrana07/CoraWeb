import { Link } from 'react-router-dom';
import '../assets/styles/Footer.css';

import localizacion from '../icons/localizacion.svg';
import buscar from '../icons/buscar.svg';
import pfp from '../icons/pfp.svg';
import info from '../icons/info.svg';


const Footer = () => {
  return (
    <footer className="footer" data-tour="footer">
      <nav className="footer-content">
        <Link className="footer-item" to="/">
          <span className="footer-icon">
            <img src={localizacion} alt="Home" />
          </span>
          <span className="footer-label">Home</span>
        </Link>

        <Link className="footer-item" to="/archivero">
          <span className="footer-icon">
            <img src={buscar} alt="Archivero" />
          </span>
          <span className="footer-label">Archivero</span>
        </Link>

        <a className="footer-item" href="#">
          <span className="footer-icon">
            <img src={info} alt="Web-Informativa" />
          </span>
          <span className="footer-label">Web informativa</span>
        </a>

        <Link className="footer-item" to="/perfil">
          <span className="footer-icon">
            <img src={pfp} alt="Perfil" />
          </span>
          <span className="footer-label">Perfil</span>
        </Link>
      </nav>
    </footer>
  );
};

export default Footer;