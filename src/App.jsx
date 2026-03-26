import { useState, useEffect } from 'react';
import './App.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';

// Importación de activos visuales para el renderizado del marcador predeterminado
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
 * Sub-componente técnico diseñado para gestionar eventos de interacción del usuario.
 * El sistema utiliza 'useMapEvents' para capturar clics en el lienzo del mapa y
 * ejecutar la función de callback proporcionada por el padre.
 */
function MapEventsHandler({ onMapClick }) {
    useMapEvents({
        click: (e) => {
            // El sistema captura las coordenadas geográficas exactas del clic.
            onMapClick(e.latlng);
        },
    });
    // Este componente es puramente lógico y no renderiza elementos visuales.
    return null;
}

/**
 * Sub-componente técnico diseñado para sincronizar la vista del mapa.
 * El sistema utiliza el hook 'useMap' para desplazar la cámara de forma
 * automática cuando se detectan nuevas coordenadas geográficas de usuario.
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
 * Componente de gestión cartográfica avanzada.
 * Administra la obtención de coordenadas en tiempo real, la lista de marcadores personalizados 
 * y la renderización interactiva del mapa.
 */
function MyMapComponent() {
    // El sistema establece una posición inicial (Heredia) mientras se procesa el GPS.
    const [userPosition, setUserPosition] = useState([10.0024, -84.1165]);
    
    // Estado destinado a almacenar la lista de marcadores personalizados agregados por el usuario.
    const [customMarkers, setCustomMarkers] = useState([]);

    useEffect(() => {
        // Verifica la disponibilidad de la API de geolocalización en el navegador del usuario.
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    // Actualiza el estado con la posición física real del dispositivo.
                    setUserPosition([latitude, longitude]);
                    console.log("Sistema: Coordenadas de usuario actualizadas mediante GPS.");
                },
                (error) => {
                    // El sistema registra fallos en la obtención de señal o denegación de permisos.
                    console.error("Sistema: Error al acceder a la ubicación:", error.message);
                },
                { 
                    enableHighAccuracy: true, // Maximiza la precisión en dispositivos móviles.
                    timeout: 10000 
                }
            );
        }
    }, []);

    /**
     * Función controladora para la adición de marcadores personalizados.
     * El sistema recibe un objeto 'latlng', genera un identificador único y actualiza
     * el estado de la lista de marcadores, provocando un re-renderizado.
     */
    const handleAddMarker = (latlng) => {
        const newMarker = {
            id: new Date().getTime(), // Generación de ID único basado en la marca de tiempo.
            position: [latlng.lat, latlng.lng],
            timestamp: new Date().toLocaleTimeString() // Registro de la hora de creación.
        };
        
        // El sistema utiliza el operador de propagación para añadir el nuevo elemento sin mutar el estado anterior.
        setCustomMarkers((prevMarkers) => [...prevMarkers, newMarker]);
        console.log(`Sistema: Nuevo punto identificado en [${latlng.lat}, ${latlng.lng}]`);
    };

    return (
        /* Renderizado del contenedor con dimensiones de pantalla completa */
        <MapContainer 
            center={userPosition} 
            zoom={15} 
            style={{ height: '100vh', width: '100vw' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Ejecuta el recienteado automático de la cámara hacia la ubicación del usuario */}
            <RecenterMap position={userPosition} />
            
            {/* Activa el manejador de eventos para capturar los clics del usuario en el mapa */}
            <MapEventsHandler onMapClick={handleAddMarker} />

            {/* Renderizado del marcador de la ubicación actual del usuario */}
            <Marker position={userPosition}>
                <Popup>
                    <strong>Cora Web</strong> <br />
                    Ubicación detectada del usuario.
                </Popup>
            </Marker>

            {/* Mapeo iterativo de la lista de marcadores personalizados */}
            {customMarkers.map((marker) => (
                <Marker key={marker.id} position={marker.position}>
                    <Popup>
                        <strong>Punto Identificado</strong> <br/>
                        ID: {marker.id} <br />
                        Registrado a las: {marker.timestamp}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}

export default App;