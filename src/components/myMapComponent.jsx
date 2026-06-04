// --- IMPORTACIONES ---
import { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';

// Importaciones FIREBASE
import { db } from '../firebase/firebaseConfig'; 
import { collection, addDoc, serverTimestamp, query, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import {
    getCurrentUser,
    getReporterName,
    setReporterName,
    isOwnReport,
} from "./ProtectedRoute.jsx"; 

// AgenteCora: analisis de riesgo del formulario
import { analyzeReport } from '../agent/agenteCora';
import CoraFeedbackModal from './CoraFeedbackModal.jsx';
import '../assets/styles/AgenteCora.css';

// Rectangulo de calificacion que AgenteCora coloca junto al punto
function RiskCard({ analysis }) {
    if (!analysis?.valid) return null;
    return (
        <div className="cora-risk-card" style={{ '--risk-hex': analysis.hex }}>
            <div className="cora-risk-card-head">
                <span className="cora-risk-dot" />
                AgenteCora: Riesgo {analysis.nivel}
            </div>
            <div className="cora-risk-card-body">
                <span className="cora-risk-score">{analysis.score}/100</span> &middot; {analysis.recomendacion}
            </div>
        </div>
    );
}

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
    const [customMarkers, setCustomMarkers] = useState([]); 
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const regionOptions = ["Colegio CTP CIT", "Soda armonia"];

    const closeFeedback = () => setFeedback(null);
    
    const [tempMarker, setTempMarker] = useState(null); 
    const [formData, setFormData] = useState({ 
        name: '', 
        region: regionOptions[0],
        wasteType: 'organico',
        amount: '',
        slope: 'plano',
        waterProximity: '˂50m',
        riskLevel: 'bajo',
        materialType: 'reciclable'
    });

    useEffect(() => {
        const reportesRef = collection(db, "reportes");
        const q = query(reportesRef);

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const puntosFirebase = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.latitud && data.longitud) {
                    puntosFirebase.push({
                        id: doc.id,
                        position: [data.latitud, data.longitud],
                        name: data.reportado_por || 'Anónimo',
                        creadoPor: data.creado_por || '',
                        region: data.region,
                        wasteType: data.tipo_residuo,
                        amount: data.cantidad,
                        slope: data.pendiente,
                        waterProximity: data.cercania_agua,
                        riskLevel: data.riesgo_contaminacion,
                        materialType: data.clasificacion_material,
                        timestamp: data.fecha_creacion ? new Date(data.fecha_creacion.seconds * 1000).toLocaleTimeString() : new Date().toLocaleTimeString()
                    });
                }
            });

            setCustomMarkers(puntosFirebase);
        }, (error) => {
            console.error("Error al traer puntos en tiempo real: ", error);
        });

        return () => unsubscribe();
    }, []);

    const activateLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
                (error) => alert("Error al obtener ubicación: " + error.message),
                { enableHighAccuracy: true }
            );
        }
    };

    const handleMapClick = (latlng) => {
        setFormData({
            name: getReporterName() || getCurrentUser() || '',
            region: regionOptions[0],
            wasteType: 'organico',
            amount: '',
            slope: 'plano',
            waterProximity: '˂50m',
            riskLevel: 'bajo',
            materialType: 'reciclable'
        }); 
        setTempMarker({
            position: [latlng.lat, latlng.lng],
            timestamp: new Date().toLocaleTimeString()
        });
    };

    // Funcion para guardae en FIREBASE
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.amount) {
            setFeedback({
                variant: "warning",
                title: "Campos incompletos",
                message:
                    "Por favor completa tu nombre y la cantidad de residuos antes de guardar el punto.",
                confirmLabel: "Entendido",
            });
            return;
        }

        setCargando(true);

        try {
            const reporterName = formData.name.trim();
            const creator = getCurrentUser();
            setReporterName(reporterName);

            const reportesRef = collection(db, "reportes");
            await addDoc(reportesRef, {
                reportado_por: reporterName,
                creado_por: creator,
                region: formData.region,
                tipo_residuo: formData.wasteType,
                cantidad: Number(formData.amount),
                pendiente: formData.slope,
                cercania_agua: formData.waterProximity,
                riesgo_contaminacion: formData.riskLevel,
                clasificacion_material: formData.materialType,
                latitud: tempMarker.position[0],
                longitud: tempMarker.position[1],
                fecha_creacion: serverTimestamp()
            });

            setTempMarker(null);
            setFeedback({
                variant: "success",
                title: "Punto registrado",
                message: (
                    <>
                        Tu reporte en <strong>{formData.region}</strong> fue guardado
                        correctamente. Ya aparece en el mapa y en el Archivero.
                    </>
                ),
                confirmLabel: "Excelente",
            });

        } catch (error) {
            console.error("Error al guardar en Firebase:", error);
            setFeedback({
                variant: "error",
                title: "No se pudo guardar",
                message:
                    "Hubo un problema al conectar con la base de datos. Revisa tu conexion e intenta de nuevo.",
                confirmLabel: "Entendido",
            });
        } finally {
            setCargando(false);
        }
    };

    const executeDelete = async (marker) => {
        setDeletingId(marker.id);
        setFeedback((prev) => (prev ? { ...prev, loading: true } : prev));

        try {
            await deleteDoc(doc(db, "reportes", marker.id));
            setFeedback({
                variant: "success",
                title: "Punto eliminado",
                message: (
                    <>
                        El reporte de <strong>{marker.name}</strong> en{" "}
                        <strong>{marker.region}</strong> fue retirado del mapa.
                    </>
                ),
                confirmLabel: "Listo",
            });
        } catch (error) {
            console.error("Error al eliminar punto:", error);
            setFeedback({
                variant: "error",
                title: "No se pudo eliminar",
                message:
                    "Ocurrio un error al borrar el punto. Intenta de nuevo en unos segundos.",
                confirmLabel: "Entendido",
            });
        } finally {
            setDeletingId(null);
        }
    };

    const handleDeleteMarker = (marker) => {
        if (!isOwnReport(marker)) {
            setFeedback({
                variant: "warning",
                title: "Accion no permitida",
                message: "Solo puedes eliminar puntos que tu hayas creado en el mapa.",
                confirmLabel: "Entendido",
            });
            return;
        }

        setFeedback({
            variant: "confirm",
            title: "Eliminar punto",
            message: (
                <>
                    ¿Eliminar el reporte de <strong>{marker.name}</strong> en{" "}
                    <strong>{marker.region}</strong>? Esta accion no se puede deshacer.
                </>
            ),
            confirmLabel: "Si, eliminar",
            cancelLabel: "Cancelar",
            onConfirm: () => executeDelete(marker),
        });
    };

    const misPuntos = customMarkers.filter(isOwnReport);

    return (
        <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>

            <CoraFeedbackModal
                open={!!feedback}
                variant={feedback?.variant}
                title={feedback?.title}
                message={feedback?.message}
                confirmLabel={feedback?.confirmLabel}
                cancelLabel={feedback?.cancelLabel}
                onConfirm={feedback?.onConfirm}
                onClose={closeFeedback}
                loading={feedback?.loading}
            />

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
                <h2 className="nature-title" style={{ margin: '0', fontSize: '1.3rem' }}>Cora Web</h2>
                
                <button data-tour="location" onClick={activateLocation} style={btnStyle(userPosition ? '#4dcec5' : '#00978D')}>
                    {userPosition ? 'Ubicación Lista' : 'Activar mi ubicación'}
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button data-tour="register" onClick={() => setIsAddingMode(true)} style={btnStyle(isAddingMode ? '#A7BD8A' : '#688f35')}>
                        Registrar punto de localización de residuos
                    </button>
                    {isAddingMode && (
                        <button onClick={() => { setIsAddingMode(false); setTempMarker(null); }} style={btnStyle('#a1303c')}>
                            Cancelar / Terminar
                        </button>
                    )}
                </div>

                {misPuntos.length > 0 && (
                    <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '10px', marginTop: '4px' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#003C43' }}>
                            Mis puntos ({misPuntos.length})
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                            {misPuntos.map((marker) => (
                                <div
                                    key={`mine-${marker.id}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    <span style={{ flex: 1, lineHeight: 1.3 }}>
                                        {marker.region} &middot; {marker.wasteType}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteMarker(marker)}
                                        disabled={deletingId === marker.id}
                                        style={{
                                            ...btnStyle(deletingId === marker.id ? '#ccc' : '#a1303c'),
                                            padding: '6px 10px',
                                            fontSize: '0.75rem',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {deletingId === marker.id ? '...' : 'Eliminar'}
                                    </button>
                                </div>
                            ))}
                        </div>
                        <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: '#666' }}>
                            Tambien puedes eliminar desde el popup del marcador en el mapa.
                        </p>
                    </div>
                )}
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
                
                            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                                <strong style={{ textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Detalles del Reporte</strong>
                                
                                <label style={{fontSize: '0.8rem'}}>Reportado por:</label>
                                <input 
                                    type="text"
                                    placeholder="Tu nombre" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    style={{ padding: '5px' }}
                                />

                                <label style={{fontSize: '0.8rem'}}>Región:</label>
                                <select
                                    value={formData.region}
                                    onChange={(e) => setFormData({...formData, region: e.target.value})}
                                    style={{ padding: '5px' }}
                                >
                                    {regionOptions.map((region) => (
                                        <option value={region} key={region}>{region}</option>
                                    ))}
                                </select>
                                
                                {/* Tipo de Residuo */}
                                <label style={{fontSize: '0.8rem'}}>Tipo de residuo:</label>
                                <select value={formData.wasteType} onChange={(e) => setFormData({...formData, wasteType: e.target.value})} style={{ padding: '5px' }}>
                                    <option value="organico">Orgánico</option>
                                    <option value="plastico">Plástico</option>
                                    <option value="vidrio">Vidrio</option>
                                    <option value="metal">Envases metálicos</option>
                                    <option value="carton">Cartón</option>
                                    <option value="papel">Papel</option>
                                </select>
                                
                                {/* Cantidad de Residuos */}
                                <label style={{fontSize: '0.8rem'}}>Cantidad de residuos:</label>
                                <input 
                                    type="number"
                                    placeholder="Cantidad"
                                    min="0" 
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    style={{ padding: '5px' }}
                                />

                                {/* Pendiente */}
                                <label style={{fontSize: '0.8rem'}}>Pendiente:</label>
                                <select value={formData.slope} onChange={(e) => setFormData({...formData, slope: e.target.value})} style={{ padding: '5px' }}>
                                    <option value="plano">Plano</option>
                                    <option value="leve">Leve</option>
                                    <option value="pronunciada">Pronunciada</option>
                                    <option value="intensa">Intensa</option>
                                </select>

                                {/* Cercania a Cuerpos de agua */}
                                <label style={{fontSize: '0.8rem'}}>Cercanía al cuerpo de agua:</label>
                                <select value={formData.waterProximity} onChange={(e) => setFormData({...formData, waterProximity: e.target.value})} style={{ padding: '5px' }}>
                                    <option value="˂50m">˂50m</option>
                                    <option value="≥100m">≥100m</option>
                                    <option value="≥500m">≥500m</option>
                                </select>

                                {/* Riesgo de contaminación */}
                                <label style={{fontSize: '0.8rem'}}>Riesgo de contaminación:</label>
                                <select value={formData.riskLevel} onChange={(e) => setFormData({...formData, riskLevel: e.target.value})} style={{ padding: '5px' }}>
                                    <option value="bajo">Bajo</option>
                                    <option value="medio">Medio</option>
                                    <option value="alto">Alto</option>
                                </select>

                                {/* Tipo de Material */}
                                <label style={{fontSize: '0.8rem'}}>El material clasifica como:</label>
                                <select value={formData.materialType} onChange={(e) => setFormData({...formData, materialType: e.target.value})} style={{ padding: '5px' }}>
                                    <option value="reciclable">Reciclable</option>
                                    <option value="no reciclable">No reciclable</option>
                                </select>

                                {(() => {
                                    const preview = analyzeReport(formData);
                                    if (!preview.valid) return null;
                                    return (
                                        <div className="cora-form-risk" style={{ '--risk-hex': preview.hex }}>
                                            <strong>AgenteCora: Riesgo {preview.nivel} ({preview.score}/100)</strong>
                                            {preview.recomendacion}
                                        </div>
                                    );
                                })()}

                                <button type="submit" disabled={cargando} style={btnStyle(cargando ? '#ccc' : '#00978D')}>
                                    {cargando ? 'Guardando...' : 'Guardar Punto'}
                                </button>
                            </form>
                        </Popup>
                    </Marker>
                )}

                {/* Marcadores */}
                {customMarkers.map((marker) => {
                    const analysis = analyzeReport(marker);
                    return (
                        <Marker key={marker.id} position={marker.position}>
                            {analysis.valid && (
                                <Tooltip permanent direction="right" offset={[12, 0]} className="cora-risk-tooltip">
                                    <RiskCard analysis={analysis} />
                                </Tooltip>
                            )}
                            <Popup>
                                <strong>Reporte: {marker.id}</strong><br/>
                                <b>Por:</b> {marker.name}<br/>
                                <b>Región:</b> {marker.region}<br/>
                                <b>Tipo:</b> {marker.wasteType}<br/>
                                <b>Cantidad:</b> {marker.amount}<br/>
                                <b>Riesgo declarado:</b> {marker.riskLevel}<br/>
                                {analysis.valid && (
                                    <>
                                        <hr style={{ margin: '6px 0' }} />
                                        <b style={{ color: analysis.hex }}>
                                            AgenteCora: Riesgo {analysis.nivel} ({analysis.score}/100)
                                        </b><br/>
                                        <span style={{ fontSize: '0.8rem' }}>{analysis.recomendacion}</span><br/>
                                    </>
                                )}
                                <small style={{ color: '#888' }}>{marker.timestamp}</small>
                                {isOwnReport(marker) && (
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteMarker(marker)}
                                        disabled={deletingId === marker.id}
                                        style={{
                                            ...btnStyle(deletingId === marker.id ? '#ccc' : '#a1303c'),
                                            marginTop: '10px',
                                            width: '100%',
                                        }}
                                    >
                                        {deletingId === marker.id ? 'Eliminando...' : 'Eliminar mi punto'}
                                    </button>
                                )}
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}

const btnStyle = (color) => ({
    padding: '10px', backgroundColor: color, color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
});

export default MyMapComponent;