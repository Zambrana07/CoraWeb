// --- IMPORTACIONES ---
import { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';

// Importación de activos para los marcadores
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
    const [customMarkers, setCustomMarkers] = useState([]); // Marcadores definitivos
    const [isAddingMode, setIsAddingMode] = useState(false);
    
    // Estados para el flujo del formulario
    const [tempMarker, setTempMarker] = useState(null); // Marcador que se está creando
    const [formData, setFormData] = useState({ name: '', description: '' });

    const activateLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
                (error) => alert("Error al obtener ubicación: " + error.message),
                { enableHighAccuracy: true }
            );
        }
    };

    // Al hacer clic, crea un marcador temporal y abre el form
    const handleMapClick = (latlng) => {
        setFormData({ name: '', description: '' }); // Limpiar campos
        setTempMarker({
            position: [latlng.lat, latlng.lng],
            timestamp: new Date().toLocaleTimeString()
        });
    };

    // Función para guardar los datos del formulario
    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.description) {
            alert("Por favor completa los campos antes de guardar.");
            return;
        }

        const newMarker = {
            ...tempMarker,
            ...formData,
            id: new Date().getTime()
        };

        setCustomMarkers((prev) => [...prev, newMarker]);
        setTempMarker(null); // Cerramos el popup temporal
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
                        <button onClick={() => { setIsAddingMode(false); setTempMarker(null); }} style={btnStyle('#a1303c')}>
                            Cancelar / Terminar
                        </button>
                    )}
                </div>
            </div>

            <MapContainer center={[9.9772, -84.1833]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <RecenterMap position={userPosition} />
                <MapEventsHandler onMapClick={handleMapClick} isActive={isAddingMode} />

                {/* Ubicación del usuario */}
                {userPosition && (
                    <Marker position={userPosition}>
                        <Popup>Ubicación actual</Popup>
                    </Marker>
                )}

                {/* Marcador temporal con el Formulario */}
                {tempMarker && (
                    <Marker position={tempMarker.position}>
                        <Popup onClose={() => setTempMarker(null)}>
                
                {/*Formulario para ingresar detalles del reporte*/}
                            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                                <strong style={{ textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Detalles del Reporte</strong>
                                
                                {/* Campo de Nombre */}
                                <label style={{fontSize: '0.8rem'}}>Reportado por:</label>
                                <input 
                                    type="text"
                                    placeholder="Tu nombre" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    style={{ padding: '5px' }}
                                />

                                {/* Tipo de Residuo */}
                                <label style={{fontSize: '0.8rem'}}>Tipo de residuo:</label>
                                <select value={formData.riskLevel} onChange={(e) => setFormData({...formData, riskLevel: e.target.value})} style={{ padding: '5px' }}>
                                    <option value="organico">Orgánico</option>
                                    <option value="plastico">Plástico</option>
                                    <option value="vidrio">Vidrio</option>
                                    <option value="metal">Envases metálicos</option>
                                    <option value="carton">Cartón</option>
                                    <option value="papel">Papel</option>
                                </select>

                                {/* Cantidad de residuos */}
                                <label style={{fontSize: '0.8rem'}}>Cantidad de residuos:</label>
                                <input 
                                    type="number"
                                    placeholder="Cantidad"
                                    min="0" // Solo permite poner números positivos
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    style={{ padding: '5px' }}
                                />

                                {/* Pendiente */}
                                <label style={{fontSize: '0.8rem'}}>Pendiente:</label>
                                <select value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} style={{ padding: '5px' }}>
                                    <option value="plano">Plano</option>
                                    <option value="leve">Leve</option>
                                    <option value="pronunciada">Pronunciada</option>
                                    <option value="intensa">Intensa</option>
                                </select>

                                {/* Cercanía al agua */}
                                <label style={{fontSize: '0.8rem'}}>Cercanía al cuerpo de agua:</label>
                                <select value={formData.waterProximity} onChange={(e) => setFormData({...formData, waterProximity: e.target.value})} style={{ padding: '5px' }}>
                                    <option value="˂50m">˂50m</option>
                                    <option value="≥100m">≥100m</option>
                                    <option value="≥500m">≥500m</option>
                                </select>

                                {/* Nivel de Riesgo */}
                                <label style={{fontSize: '0.8rem'}}>Riesgo de contaminación:</label>
                                <select value={formData.riskLevel} onChange={(e) => setFormData({...formData, riskLevel: e.target.value})} style={{ padding: '5px' }}>
                                    <option value="bajo">Bajo</option>
                                    <option value="medio">Medio</option>
                                    <option value="alto">Alto</option>
                                </select>

                                <button type="submit" style={btnStyle('#00978D')}>Guardar Punto</button>
                            </form>
                        </Popup>
                    </Marker>
                )}

                {/* Marcadores*/}
                {customMarkers.map((marker) => (
                    <Marker key={marker.id} position={marker.position}>
                        <Popup>
                            <strong>{marker.name}</strong><br/>
                            {marker.description}<br/>
                            <small style={{ color: '#888' }}>{marker.timestamp}</small>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}

const btnStyle = (color) => ({
    padding: '10px', backgroundColor: color, color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
});

export default MyMapComponent;