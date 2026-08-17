import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './main.css'

/**
 * Punto de entrada principal (Entry Point) de la aplicación:
 * 
 * Se encarga de inicializar el árbol de componentes mediante la API de Client Root (`ReactDOM.createRoot`),
 * vinculando la interfaz al elemento contenedor `#root` del DOM. Importa la hoja de estilos globales (`main.css`)
 * y renderiza el componente raíz `<App />`.
 * 
 * Envuelve la aplicación en `<React.StrictMode>` para habilitar verificaciones y advertencias de desarrollo
 * adicionales, tales como la detección de efectos secundarios no deseados o el uso de APIs obsoletas.
 */

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <App />
  </React.StrictMode>,
)
