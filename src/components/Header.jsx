import React from 'react';
import './Header.css';
import logo from '../assets/CoraLogo.png'; 

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