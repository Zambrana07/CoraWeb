import React from 'react';
import '../assets/styles/Footer.css'; 
import HomeIcon from '../assets/img/icons/house-solid-full.svg';
import ArchiveIcon from '../assets/img/icons/box-archive-solid-full.svg'
import WebIcon from '../assets/img/icons/globe-solid-full.svg'
import UsrIcon from '../assets/img/icons/circle-user-solid-full.svg'

/**
 * Componente Footer de navegación fija para la aplicación:
 * 
 * Funciona como una barra de navegación inferior estática que facilita el acceso rápido a las secciones principales 
 * de la plataforma (Inicio, Archivero, Web informativa y Perfil). Cada opción integra un icono SVG representativo 
 * junto a su etiqueta textual correspondiente, organizada de forma semántica mediante un elemento `<nav>`.
 * 
 * Incluye un atributo de atributo de datos `data-tour="footer"` para permitir la integración y focalización del componente 
 * por parte de librerías de guiado de usuario (onboarding tours). Además, admite la inyección opcional de estilos directos 
 * a través de la propiedad `style` para adaptar su presentación en vistas específicas.
 */

const Footer = ({ style }) => {
  return (
    <footer className="footer" data-tour="footer">
      <nav className="footer-content">
        <a className="footer-item" href="/">
          <span className="footer-icon"><img src={HomeIcon} alt="" /></span>
          <span className="footer-label">Home</span>
        </a>
        <a className="footer-item" href="/archivero">
          <span className="footer-icon"><img src={ArchiveIcon} alt="" /></span>
          <span className="footer-label">Archivero</span>
        </a>
        <a className="footer-item" href="/informativa">
          <span className="footer-icon"><img src={WebIcon} alt="" /></span>
          <span className="footer-label">Web informativa</span>
        </a>
        <a className="footer-item" href="/perfil">
          <span className="footer-icon"><img src={UsrIcon} alt="" /></span>
          <span className="footer-label">Perfil</span>
        </a>
      </nav>
    </footer>
  );
};

export default Footer;
