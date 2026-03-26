import { useState, useEffect } from 'react';
import './App.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';

// Importación de activos visuales para el renderizado del marcador
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

/**
 * Reconfiguración de los iconos predeterminados de Leaflet.
 * El sistema sobrescribe las rutas internas para asegurar la compatibilidad
 * con el empaquetador de activos (Vite/Webpack).
 */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

/**
 * Sub-componente técnico diseñado para sincronizar la vista del mapa.
 * El sistema utiliza el hook 'useMap' para desplazar la cámara de forma
 * automática cuando se detectan nuevas coordenadas geográficas.
 */
function RecenterMap({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            // El sistema ajusta la vista a la posición detectada con un zoom de nivel 15.
            map.setView(position, 15);
        }
    }, [position, map]);
    return null;
}

function App() {
    return (
        <div className="app">
            <h1>Cora Web</h1>
            <p>Plantilla inicial de Cora (usando Leaflet gratuito)</p>
            <MyMapComponent />
        </div>
    );
}

/**
 * Componente de gestión cartográfica.
 * Administra la obtención de coordenadas en tiempo real y el renderizado del mapa.
 */
function MyMapComponent() {
    // El sistema establece una posición inicial (Heredia) mientras se procesa el GPS.
    const [position, setPosition] = useState([10.0024, -84.1165]);

    useEffect(() => {
        // Verifica la disponibilidad de la API de geolocalización en el navegador del usuario.
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    // Actualiza el estado con la posición física real del dispositivo.
                    setPosition([latitude, longitude]);
                    console.log("Sistema: Coordenadas actualizadas mediante GPS.");
                },
                (error) => {
                    // El sistema registra fallos en la obtención de señal o denegación de permisos.
                    console.error("Sistema: Error al acceder a la ubicación:", error.message);
                },
                { 
                    enableHighAccuracy: true, // Maximiza la precisión en dispositivos móviles.
                    timeout: 5000 
                }
            );
        }
    }, []);

    return (
        /* Renderizado del contenedor con dimensiones de pantalla completa */
        <MapContainer 
            center={position} 
            zoom={15} 
            style={{ height: '100vh', width: '100vw' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Ejecuta el recienteado automático de la cámara */}
            <RecenterMap position={position} />

            <Marker position={position}>
                <Popup>
                    <strong>Cora Web</strong> <br />
                    Ubicación detectada en tiempo real.
                </Popup>
            </Marker>
        </MapContainer>
    );
}

export default App;