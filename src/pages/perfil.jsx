import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import '..styles/perfil.css'


function Perfil() {
  return (
    <div> Alan Brito <div/> </div>
  )
}   
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)