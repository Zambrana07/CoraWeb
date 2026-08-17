/**
 * myMapComponent.jsx — corazón del producto: mapa Leaflet de puntos de residuos.
 *
 * Qué hace, en orden:
 *  1. Pide GPS y dibuja un círculo de precisión.
 *  2. Carga reportes (GET /api/reportes) y se suscribe a Realtime de Supabase.
 *  3. Modo "Registrar punto": un clic pone un marcador temporal + formulario.
 *  4. Comprime fotos a JPEG ≤ 2 MB (máx. 3) y las manda como data URL.
 *  5. POST /api/reportes crea el punto.
 *  6. AgenteCora.analyzeReport pinta color/puntuación junto a cada pin.
 *
 * Subcomponentes Leaflet: RecenterMap, FocusMap, MapEventsHandler.
 * data-tour en los botones sirve al tutorial CoraTour.
 */
// --- IMPORTACIONES ---
import { useState, useEffect, memo } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents, Circle, CircleMarker, Pane } from 'react-leaflet';
import CoraFeedbackModal from './CoraFeedbackModal.jsx';
import { supabase } from '../lib/supabaseClient';

// AgenteCora: analisis de riesgo del formulario
import { analyzeReport } from '../agent/agenteCora';
import '../assets/styles/AgenteCora.css';


// Rectangulo de calificacion que AgenteCora coloca junto al punto
const RiskCard = memo(({ analysis }) => {
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
});

// Convierte una fila de la API / Realtime al objeto que usa cada Marker.
function mapReporteToMarker(reporte) {
    return {
        id: reporte.id,
        position: [reporte.latitud, reporte.longitud],
        name: reporte.reportado_por ? String(reporte.reportado_por) : 'Anónimo',
        region: reporte.region_name || 'Sin región',
        verified: reporte.verificado || false,
        wasteType: reporte.tipo_residuo,
        amount: reporte.cantidad,
        slope: reporte.pendiente,
        waterProximity: reporte.cercania_agua,
        riskLevel: reporte.riesgo_contaminacion,
        materialType: reporte.clasificacion_material,
        timestamp: reporte.fecha_creacion ? new Date(reporte.fecha_creacion).toLocaleTimeString() : new Date().toLocaleTimeString(),
        imagenes: reporte.imagenes || [],
    };
}

// Supabase a veces manda el registro en .new, .record o anidado.
function getRealtimeReportPayload(payload) {
    return payload?.new ?? payload?.record ?? payload?.payload?.new ?? payload;
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
    // Solo registra clics cuando el usuario activó "Registrar punto".
    useMapEvents({
        click: (e) => {
            if (isActive) onMapClick(e.latlng);
        },
    });
    return null;
}

function RecenterMap({ position, disabled }) {
    const map = useMap();

    // Vuela el mapa a la GPS del usuario (se puede desactivar desde el perfil).
    useEffect(() => {
        if (position && !disabled) {
            map.flyTo(position, 16);
        }
    }, [position, map, disabled]);

    return null;
}

function FocusMap({ position }) {
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
    const [feedback, setFeedback] = useState(null);
    const closeFeedback = () => setFeedback(null);
    const showFeedback = (payload) => setFeedback(payload);
    const USER_ID = JSON.parse(localStorage.getItem("user")).id;
    const location = useLocation();
    const navigate = useNavigate();
    const focusPoint = location.state?.focus;
    const skipLocationFly = location.state?.skipLocationFly;
    const [focusPosition, setFocusPosition] = useState(null);
    const [userPosition, setUserPosition] = useState(null);
    const [customMarkers, setCustomMarkers] = useState([]);
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [regionOptions, setRegionOptions] = useState([]);
    const [perfil, setPerfil] = useState(null);
    const [images, setImages] = useState([]);
    const [imageError, setImageError] = useState('');
    const [locationEnabled, setLocationEnabled] = useState(() => {
        return localStorage.getItem("locationEnabled") === "true";
    });

    const MAX_IMAGES = 3;
    const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

    const fileToImage = (file) => {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = (error) => {
                URL.revokeObjectURL(url);
                reject(new Error(`No se pudo cargar la imagen ${file.name}`));
            };
            img.src = url;
        });
    };

    const canvasToBlob = (canvas, type, quality) => {
        return new Promise((resolve) => {
            canvas.toBlob(resolve, type, quality);
        });
    };

    // Reduce lado largo a 1200px y baja calidad JPEG hasta caber en 2 MB.
    const compressImageFile = async (file) => {
        const image = await fileToImage(file);
        const maxDimension = 1200;
        let width = image.width;
        let height = image.height;

        if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, width, height);

        let quality = 0.85;
        let blob = await canvasToBlob(canvas, 'image/jpeg', quality);

        while (blob && blob.size > MAX_IMAGE_SIZE && quality > 0.45) {
            quality -= 0.1;
            blob = await canvasToBlob(canvas, 'image/jpeg', quality);
        }

        if (!blob) {
            throw new Error(`No se pudo comprimir la imagen ${file.name}`);
        }

        if (blob.size > MAX_IMAGE_SIZE) {
            throw new Error(`La imagen ${file.name} supera los 2 MB después de la compresión.`);
        }

        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });

        return {
            name: file.name,
            dataUrl,
            size: blob.size,
            type: 'image/jpeg',
        };
    };

    // Valida tipo, comprime y acumula hasta MAX_IMAGES (3).
    const handleImageSelection = async (event) => {
        const selectedFiles = Array.from(event.target.files || []);
        if (selectedFiles.length === 0) {
            return;
        }

        if (images.length + selectedFiles.length > MAX_IMAGES) {
            setImageError(`Solo puedes subir hasta ${MAX_IMAGES} imágenes.`);
            event.target.value = '';
            return;
        }

        try {
            setImageError('');
            const compressedFiles = [];
            for (const file of selectedFiles) {
                if (!file.type.startsWith('image/')) {
                    throw new Error(`El archivo ${file.name} no es una imagen válida.`);
                }
                compressedFiles.push(await compressImageFile(file));
            }

            setImages((current) => [...current, ...compressedFiles].slice(0, MAX_IMAGES));
        } catch (error) {
            setImageError(error.message || 'Error al procesar las imágenes.');
        } finally {
            event.target.value = '';
        }
    };

    const removeImage = (index) => {
        setImages((current) => current.filter((_, idx) => idx !== index));
    };

    async function cargarPerfil() {
        try {
            const response = await fetch(
                "http://localhost:3000/api/load-perfil",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        id: USER_ID,
                    }),
                }
            );

            const data = await response.json();
            setPerfil(data.perfil);

        } catch (error) {
        }
    }
    const [tempMarker, setTempMarker] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        region: '',
        wasteType: 'organico',
        amount: '',
        slope: 'plano',
        waterProximity: '˂50m',
        riskLevel: 'bajo',
        materialType: 'reciclable'
    });

    useEffect(() => {
        if (perfil) {
            setFormData(prev => ({
                ...prev,
                name: perfil.nombre || ''
            }));
        }
    }, [perfil]);

    useEffect(() => {
        if (tempMarker) {
            cargarPerfil();
        }
    }, [tempMarker]);

    useEffect(() => {
        const cargarRegiones = async () => {
            try {
                const response = await fetch("http://localhost:3000/api/regiones");
                const data = await response.json();
                if (!data.ok) {
                    throw new Error(data.message || "Error al cargar regiones");
                }
                const opciones = data.regiones.map((region) => region.region_name);
                setRegionOptions(opciones);
                setFormData((prev) => ({
                    ...prev,
                    region: prev.region || opciones[0] || ''
                }));
            } catch (error) {
            }
        };
        cargarRegiones();
    }, []);

    useEffect(() => {
        if (!focusPoint) return;

        setFocusPosition(focusPoint);

        window.history.replaceState({}, document.title);
    }, [focusPoint]);

    useEffect(() => {
        if (locationEnabled && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserPosition([
                        pos.coords.latitude,
                        pos.coords.longitude
                    ]);
                },
                (error) => {
                    showFeedback({
                        variant: 'error',
                        title: 'Ubicación',
                        message: 'Error al obtener ubicación: ' + error.message,
                        confirmLabel: 'Entendido'
                    });
                },
                { enableHighAccuracy: true }
            );
        }
    }, [locationEnabled]);

    // Lista inicial de pines desde Express (no desde Supabase directo).
    async function cargarReportes() {
        try {
            const response = await fetch("http://localhost:3000/api/reportes");
            const data = await response.json();

            if (!data.ok) {
                throw new Error(data.message || "Error al cargar reportes");
            }

            const puntos = data.reportes.map((reporte) => ({
                id: reporte.id,
                position: [reporte.latitud, reporte.longitud],
                name: reporte.reportado_por || 'Anónimo',
                region: reporte.region_name || 'Sin región',
                verified: reporte.verificado || false,
                wasteType: reporte.tipo_residuo,
                amount: reporte.cantidad,
                slope: reporte.pendiente,
                waterProximity: reporte.cercania_agua,
                riskLevel: reporte.riesgo_contaminacion,
                materialType: reporte.clasificacion_material,
                imagenes: reporte.imagenes || [],
                timestamp: reporte.fecha_creacion ? new Date(reporte.fecha_creacion).toLocaleTimeString() : new Date().toLocaleTimeString()
            }));

            setCustomMarkers(puntos);
        } catch (error) {
        }
    }

    useEffect(() => {
        cargarReportes();

        const channel = supabase
            .channel('reportes-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reportes' }, (payload) => {
                const eventType = payload.eventType || payload.event || payload.type;
                const registro = payload.record || payload.new || null;
                const oldRegistro = payload.old_record || payload.old || null;

                if (eventType === 'INSERT' && registro?.id) {
                    setCustomMarkers((current) => {
                        const nuevo = mapReporteToMarker(registro);
                        return [nuevo, ...current.filter((item) => item.id !== registro.id)];
                    });
                }
                if (eventType === 'UPDATE' && registro?.id) {
                    setCustomMarkers((current) => current.map((item) => (item.id === registro.id ? mapReporteToMarker(registro) : item)));
                }
                if (eventType === 'DELETE' && oldRegistro?.id) {
                    setCustomMarkers((current) => current.filter((item) => item.id !== oldRegistro.id));
                }
            });

        channel.subscribe();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, []);

    const activateLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
                (error) => showFeedback({
                    variant: 'error',
                    title: 'Ubicación no disponible',
                    message: 'Error al obtener ubicación: ' + error.message,
                    confirmLabel: 'Entendido'
                }),
                { enableHighAccuracy: true }
            );
        }
    };

    // Clic en el mapa (solo en modo registro): coloca el pin temporal y el formulario.
    const handleMapClick = (latlng) => {
        setFormData({
            name: '',
            region: regionOptions[0] || '',
            wasteType: 'organico',
            amount: '',
            slope: 'plano',
            waterProximity: '˂50m',
            riskLevel: 'bajo',
            materialType: 'reciclable'
        });
        setImages([]);
        setImageError('');
        setTempMarker({
            position: [latlng.lat, latlng.lng],
            timestamp: new Date().toLocaleTimeString()
        });
    };

    const toggleLocation = () => {
        if (locationEnabled) {
            // Desactivar ubicación
            setUserPosition(null);
            setLocationEnabled(false);
            localStorage.setItem("locationEnabled", "false");
            return;
        }

        // Activar ubicación
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserPosition([
                        pos.coords.latitude,
                        pos.coords.longitude
                    ]);

                    setLocationEnabled(true);
                    localStorage.setItem("locationEnabled", "true");
                },
                (error) => {
                    showFeedback({
                        variant: 'error',
                        title: 'Ubicación',
                        message: 'Error al obtener ubicación: ' + error.message,
                        confirmLabel: 'Entendido'
                    });
                },
                { enableHighAccuracy: true }
            );
        }
    };
    // Envía el reporte nuevo. El servidor puede rechazar si hay demasiados sin verificar.
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.amount) {
            showFeedback({
                variant: 'warning',
                title: 'Faltan campos',
                message: 'Por favor completa los campos obligatorios antes de guardar.',
                confirmLabel: 'Entendido'
            });
            return;
        }

        if (images.length > MAX_IMAGES) {
            showFeedback({
                variant: 'warning',
                title: 'Límite de imágenes',
                message: `Solo puedes subir hasta ${MAX_IMAGES} imágenes.`,
                confirmLabel: 'Entendido'
            });
            return;
        }

        setCargando(true);

        try {
            const response = await fetch("http://localhost:3000/api/reportes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    usuarioId: USER_ID,
                    regionName: formData.region,
                    wasteType: formData.wasteType,
                    amount: Number(formData.amount),
                    slope: formData.slope,
                    waterProximity: formData.waterProximity,
                    riskLevel: formData.riskLevel,
                    materialType: formData.materialType,
                    latitud: tempMarker.position[0],
                    longitud: tempMarker.position[1],
                    imagenes: images.map((img) => img.dataUrl),
                }),
            });

            const data = await response.json();

            if (!data.ok) {
                throw new Error(data.message || "Error al guardar el reporte");
            }

            await cargarPerfil();
            await cargarReportes();

            showFeedback({
                variant: 'success',
                title: 'Reporte guardado',
                message: 'Punto registrado correctamente.',
                confirmLabel: 'Perfecto'
            });
            setTempMarker(null);
            setImages([]);
            setImageError('');

        } catch (error) {
            showFeedback({
                variant: 'error',
                title: 'Error',
                message: 'Hubo un error al guardar el reporte. ' + error.message,
                confirmLabel: 'Entendido'
            });
        } finally {
            setCargando(false);
        }
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
                <h2 className="nature-title" style={{ margin: '0', fontSize: '1.3rem' }}>Cora Web</h2>

                <button
                    data-tour="location"
                    onClick={toggleLocation}
                    style={btnStyle(locationEnabled ? '#4dcec5' : '#00978D')}
                >
                    {locationEnabled
                        ? 'Desactivar ubicación'
                        : 'Activar mi ubicación'}
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button data-tour="register" onClick={() => setIsAddingMode(true)} style={btnStyle(isAddingMode ? '#A7BD8A' : '#688f35')}>
                        Registrar punto de localización de residuos
                    </button>
                    {isAddingMode && (
                        <button onClick={() => { setIsAddingMode(false); setTempMarker(null); setImages([]); setImageError(''); }} style={btnStyle('#a1303c')}>
                            Cancelar / Terminar
                        </button>
                    )}
                </div>
            </div>

            <MapContainer center={[9.9772, -84.1833]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FocusMap position={focusPosition} />

                <RecenterMap
                    position={userPosition}
                    disabled={skipLocationFly}
                />
                <MapEventsHandler onMapClick={handleMapClick} isActive={isAddingMode} />

                {/* precisión */}
                {userPosition && (
                    <Pane name="user-layer" style={{ zIndex: 1000 }}>
                        <Circle
                            center={userPosition}
                            radius={50}
                            pathOptions={{
                                color: "#2A93EE",
                                fillColor: "#2A93EE",
                                fillOpacity: 0.15,
                                weight: 1,
                            }}
                        />

                        <CircleMarker
                            center={userPosition}
                            radius={8}
                            pathOptions={{
                                color: "#fff",
                                weight: 2,
                                fillColor: "#2A93EE",
                                fillOpacity: 1,
                            }}
                        >
                            <Popup>Ubicación actual</Popup>
                        </CircleMarker>
                    </Pane>
                )}

                {/* Marcador temporal con el Formulario */}
                {tempMarker && (
                    <Marker position={tempMarker.position}>
                        <Popup onClose={() => { setTempMarker(null); setImages([]); setImageError(''); }}>

                            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                                <strong style={{ textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Detalles del Reporte</strong>

                                <label style={{ fontSize: '0.8rem' }}>Reportado por:</label>
                                <input
                                    type="text"
                                    placeholder="Tu nombre"
                                    value={formData.name}
                                    disabled={!!perfil?.nombre}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={{
                                        padding: '5px',
                                        backgroundColor: perfil?.nombre ? '#f0f0f0' : 'white',
                                        cursor: perfil?.nombre ? 'not-allowed' : 'text'
                                    }}
                                />

                                <label style={{ fontSize: '0.8rem' }}>Región:</label>
                                <select
                                    value={formData.region}
                                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                                    style={{ padding: '5px' }}
                                >
                                    {regionOptions.length > 0 ? (
                                        regionOptions.map((region) => (
                                            <option value={region} key={region}>{region}</option>
                                        ))
                                    ) : (
                                        <option value="" disabled>Cargando regiones...</option>
                                    )}
                                </select>

                                {/* Tipo de Residuo */}
                                <label style={{ fontSize: '0.8rem' }}>Tipo de residuo:</label>
                                <select value={formData.wasteType} onChange={(e) => setFormData({ ...formData, wasteType: e.target.value })} style={{ padding: '5px' }}>
                                    <option value="organico">Orgánico</option>
                                    <option value="plastico">Plástico</option>
                                    <option value="vidrio">Vidrio</option>
                                    <option value="metal">Envases metálicos</option>
                                    <option value="carton">Cartón</option>
                                    <option value="papel">Papel</option>
                                </select>

                                {/* Cantidad de Residuos */}
                                <label style={{ fontSize: '0.8rem' }}>Cantidad de residuos:</label>
                                <input
                                    type="number"
                                    placeholder="Cantidad"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    style={{ padding: '5px' }}
                                />

                                {/* Pendiente */}
                                <label style={{ fontSize: '0.8rem' }}>Pendiente:</label>
                                <select value={formData.slope} onChange={(e) => setFormData({ ...formData, slope: e.target.value })} style={{ padding: '5px' }}>
                                    <option value="plano">Plano</option>
                                    <option value="leve">Leve</option>
                                    <option value="pronunciada">Pronunciada</option>
                                    <option value="intensa">Intensa</option>
                                </select>

                                {/* Cercania a Cuerpos de agua */}
                                <label style={{ fontSize: '0.8rem' }}>Cercanía al cuerpo de agua:</label>
                                <select value={formData.waterProximity} onChange={(e) => setFormData({ ...formData, waterProximity: e.target.value })} style={{ padding: '5px' }}>
                                    <option value="˂50m">˂50m</option>
                                    <option value="≥100m">≥100m</option>
                                    <option value="≥500m">≥500m</option>
                                </select>

                                {/* Riesgo de contaminación */}
                                <label style={{ fontSize: '0.8rem' }}>Riesgo de contaminación:</label>
                                <select value={formData.riskLevel} onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })} style={{ padding: '5px' }}>
                                    <option value="bajo">Bajo</option>
                                    <option value="medio">Medio</option>
                                    <option value="alto">Alto</option>
                                </select>

                                {/* Tipo de Material */}
                                <label style={{ fontSize: '0.8rem' }}>El material clasifica como:</label>
                                <select value={formData.materialType} onChange={(e) => setFormData({ ...formData, materialType: e.target.value })} style={{ padding: '5px' }}>
                                    <option value="reciclable">Reciclable</option>
                                    <option value="no reciclable">No reciclable</option>
                                </select>

                                <label style={{ fontSize: '0.8rem' }}>Imágenes (máximo {MAX_IMAGES}):</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageSelection}
                                    style={{ padding: '5px' }}
                                />
                                {imageError && (
                                    <div style={{ color: 'red', fontSize: '0.8rem' }}>{imageError}</div>
                                )}
                                {images.length > 0 && (
                                    <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                                        {images.map((img, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <img
                                                    src={img.dataUrl}
                                                    alt={`preview-${idx}`}
                                                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ccc' }}
                                                />
                                                <div style={{ flex: 1, fontSize: '0.8rem' }}>
                                                    <div>{img.name}</div>
                                                    <div style={{ color: '#555' }}>{(img.size / 1024).toFixed(1)} KB</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(idx)}
                                                    style={{
                                                        background: '#a1303c',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        padding: '6px 10px',
                                                        cursor: 'pointer'
                                                    }}
                                                >Eliminar</button>
                                            </div>
                                        ))}
                                    </div>
                                )}

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
                                <strong>Reporte: {marker.id}</strong><br />
                                <b>Por:</b> {marker.name}<br />
                                <b>Región:</b> {marker.region}<br />
                                <b>Tipo:</b> {marker.wasteType}<br />
                                <b>Cantidad:</b> {marker.amount}<br />
                                <b>Riesgo declarado:</b> {marker.riskLevel}<br />
                                <b>Estado:</b> {marker.verified ? "Verificado" : "No verificado"}<br />
                                {analysis.valid && (
                                    <>
                                        <hr style={{ margin: '6px 0' }} />
                                        <b style={{ color: analysis.hex }}>
                                            AgenteCora: Riesgo {analysis.nivel} ({analysis.score}/100)
                                        </b><br />
                                        <span style={{ fontSize: '0.8rem' }}>{analysis.recomendacion}</span><br />
                                    </>
                                )}
                                {marker.imagenes && marker.imagenes.length > 0 && (
                                    <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
                                        <strong>Imágenes:</strong>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {marker.imagenes.slice(0, 3).map((src, idx) => (
                                                <img
                                                    key={idx}
                                                    src={src}
                                                    alt={`Reporte ${marker.id} imagen ${idx + 1}`}
                                                    style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ddd' }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <small style={{ color: '#888' }}>{marker.timestamp}</small>
                            </Popup>
                        </Marker>
                    );
                })}
                </MapContainer>
            {feedback && (
                <CoraFeedbackModal
                    open={!!feedback}
                    variant={feedback.variant}
                    title={feedback.title}
                    message={feedback.message}
                    confirmLabel={feedback.confirmLabel}
                    cancelLabel={feedback.cancelLabel}
                    onConfirm={feedback.onConfirm}
                    loading={feedback.loading || false}
                    onClose={closeFeedback}
                />
            )}
        </div>
    );
}

const btnStyle = (color) => ({
    padding: '10px', backgroundColor: color, color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
});

export default MyMapComponent;