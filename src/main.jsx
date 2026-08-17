/**
 * main.jsx — arranque de CoraWeb.
 *
 * Vite carga este archivo desde index.html. Se busca el <div id="root">
 * y ahí se monta todo React, empezando por <App />.
 *
 * StrictMode (solo en desarrollo) ayuda a detectar bugs; a veces hace
 * que un useEffect se ejecute dos veces. Eso es normal.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Colores, tipografía, barras de iOS y clase .nature-title.
import './main.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <App />
  </React.StrictMode>,
)
