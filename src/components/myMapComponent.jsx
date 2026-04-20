import { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';

// Importación de activos para los marcadores (Necesario para Vite/Webpack)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Configuración de iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

// --- SUB-COMPONENTES LÓGICOS ---
function MapEventsHandler({ onMapClick, isActive }) {
    useMapEvents({
        click: (e) => {
            if (isActive) onMapClick(e.latlng);
        },
    });
    return null;
}

function RecenterMap({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, 16);
        }
    }, [position, map]);
    return null;
}

// --- COMPONENTE PRINCIPAL ---
function MyMapComponent() {
    const [userPosition, setUserPosition] = useState(null);
    const [customMarkers, setCustomMarkers] = useState([]);
    const [isAddingMode, setIsAddingMode] = useState(false);

    const activateLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
                (error) => alert("Error al obtener ubicación: " + error.message),
                { enableHighAccuracy: true }
            );
        }
    };

    const handleAddMarker = (latlng) => {
        const newMarker = {
            id: new Date().getTime(),
            position: [latlng.lat, latlng.lng],
            timestamp: new Date().toLocaleTimeString()
        };
        setCustomMarkers((prev) => [...prev, newMarker]);
    };

    return (
        <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>
            
            {/* Cuadro Flotante - UI */}
                <div style={{
                    position: 'fixed', 
                    top: '80px',   
                    left: '20px', 
                    zIndex: 1000, 
                    backgroundColor: 'white', 
                    padding: '20px', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)', 
                    display: 'flex',
                    flexDirection: 'column', 
                    gap: '10px', 
                    minWidth: '220px'
                }}>
                <h2 style={{ margin: '0', fontSize: '1.3rem' }}>Cora Web</h2>
                
                <button onClick={activateLocation} style={btnStyle(userPosition ? '#4dcec5' : '#00978D')}>
                    {userPosition ? 'Ubicación Lista' : 'Activar mi ubicación'}
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button onClick={() => setIsAddingMode(true)} style={btnStyle(isAddingMode ? '#A7BD8A' : '#688f35')}>
                        Registrar punto de localización de residuos
                    </button>
                    {isAddingMode && (
                        <button onClick={() => setIsAddingMode(false)} style={btnStyle('#a1303c')}>
                            Cancelar / Terminar
                        </button>
                    )}
                </div>
            </div>

            <MapContainer center={[9.9772, -84.1833]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <RecenterMap position={userPosition} />
                <MapEventsHandler onMapClick={handleAddMarker} isActive={isAddingMode} />

                {userPosition && (
                    <Marker position={userPosition}>
                        <Popup>Ubicación actual</Popup>
                    </Marker>
                )}

                {customMarkers.map((marker) => (
                    <Marker key={marker.id} position={marker.position}>
                        <Popup>Punto ID: {marker.id}<br/>Hora: {marker.timestamp}</Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}

// Función auxiliar para estilos de botones
const btnStyle = (color) => ({
    padding: '10px', backgroundColor: color, color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
});

export default MyMapComponent;