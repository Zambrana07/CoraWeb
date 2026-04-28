import React from 'react';
import './Footer.css'; 

const Footer = () => {
  return (
    <footer className="footer">
      <nav className="footer-content">
        <a className="footer-item" href="/">
          <span className="footer-icon">H</span>
          <span className="footer-label">Home</span>
        </a>
        <a className="footer-item" href="/archivero">
          <span className="footer-icon">A</span>
          <span className="footer-label">Archivero</span>
        </a>
        <a className="footer-item" href="#">
          <span className="footer-icon">W</span>
          <span className="footer-label">Web informativa</span>
        </a>
        <a className="footer-item" href="#">
          <span className="footer-icon">P</span>
          <span className="footer-label">Perfil</span>
        </a>
      </nav>
    </footer>
  );
};

export default Footer;
