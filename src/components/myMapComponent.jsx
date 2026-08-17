// --- IMPORTACIONES ---
import { useState, useEffect, useRef, memo } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents, Circle, CircleMarker, Pane, Polyline } from 'react-leaflet';
import CoraFeedbackModal from './CoraFeedbackModal.jsx';
import { supabase } from '../lib/supabaseClient';

// AgenteCora: analisis de riesgo del formulario y revision de imagenes
import { analyzeReport } from '../agent/agenteCora';
import '../assets/styles/AgenteCora.css';

const bounds = [
  [-90, -180], // Esquina suroeste (Polo Sur, Antimeridiano oeste)
  [90, 180]    // Esquina noreste (Polo Norte, Antimeridiano este)
];


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
    useMapEvents({
        click: (e) => {
            if (isActive) onMapClick(e.latlng);
        },
    });
    return null;
}

// Con la ubicacion en tiempo real la posicion cambia constantemente, por eso solo centramos
// en la primera lectura de cada activacion y despues dejamos que el usuario mueva el mapa.
function RecenterMap({ position, disabled }) {
    const map = useMap();
    const centered = useRef(false);

    useEffect(() => {
        if (!position) {
            centered.current = false;
            return;
        }
        if (disabled || centered.current) return;
        centered.current = true;
        map.flyTo(position, 16);
    }, [position, map, disabled]);

    return null;
}

function FitRoute({ coords }) {
    const map = useMap();

    useEffect(() => {
        if (!coords || coords.length === 0) return;
        map.fitBounds(L.latLngBounds(coords), { padding: [70, 70] });
    }, [coords, map]);

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
    const [locationAccuracy, setLocationAccuracy] = useState(null);
    const [customMarkers, setCustomMarkers] = useState([]);
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [regionOptions, setRegionOptions] = useState([]);
    const [perfil, setPerfil] = useState(null);
    const [images, setImages] = useState([]);
    const [imageError, setImageError] = useState('');
    const [revisandoImagenes, setRevisandoImagenes] = useState(false);
    const [route, setRoute] = useState(null);
    const [routeLoadingId, setRouteLoadingId] = useState(null);
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
            setRevisandoImagenes(true);
            const compressedFiles = [];
            for (const file of selectedFiles) {
                if (!file.type.startsWith('image/')) {
                    throw new Error(`El archivo ${file.name} no es una imagen válida.`);
                }
                const compressed = await compressImageFile(file);
                compressedFiles.push(compressed);
            }

            setImages((current) => [...current, ...compressedFiles].slice(0, MAX_IMAGES));
        } catch (error) {
            setImageError(error.message || 'Error al procesar las imágenes.');
        } finally {
            setRevisandoImagenes(false);
            event.target.value = '';
        }
    };

    const removeImage = (index) => {
        setImages((current) => current.filter((_, idx) => idx !== index));
    };

    async function cargarPerfil() {
        try {
            const response = await fetch(
                "/api/load-perfil",
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
                const response = await fetch("/api/regiones");
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

    // Ubicacion en tiempo real: el navegador nos avisa cada vez que el GPS cambia de posicion.
    useEffect(() => {
        if (!locationEnabled || !("geolocation" in navigator)) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setUserPosition([pos.coords.latitude, pos.coords.longitude]);
                setLocationAccuracy(pos.coords.accuracy);
            },
            (error) => {
                setLocationEnabled(false);
                localStorage.setItem("locationEnabled", "false");
                showFeedback({
                    variant: 'error',
                    title: 'Ubicación',
                    message: 'Error al obtener ubicación: ' + error.message,
                    confirmLabel: 'Entendido'
                });
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [locationEnabled]);

    async function cargarReportes() {
        try {
            const response = await fetch("/api/reportes");
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
        const activar = !locationEnabled;
        setLocationEnabled(activar);
        localStorage.setItem("locationEnabled", String(activar));

        if (!activar) {
            setUserPosition(null);
            setLocationAccuracy(null);
            setRoute(null);
        }
    };

    const formatDistance = (metros) => (
        metros >= 1000 ? `${(metros / 1000).toFixed(1)} km` : `${Math.round(metros)} m`
    );

    const formatDuration = (segundos) => {
        const minutos = Math.round(segundos / 60);
        if (minutos < 60) return `${minutos} min`;
        return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
    };

    // Traza la ruta a pie desde la ubicacion del usuario hasta el punto reportado.
    const verRuta = async (marker) => {
        if (!userPosition) {
            showFeedback({
                variant: 'warning',
                title: 'Activa tu ubicación',
                message: 'Para trazarte la ruta necesito saber dónde estás. Toca "Activar mi ubicación" y vuelve a intentarlo.',
                confirmLabel: 'Entendido'
            });
            return;
        }

        setRouteLoadingId(marker.id);

        const [origenLat, origenLng] = userPosition;
        const [destinoLat, destinoLng] = marker.position;

        try {
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/foot/${origenLng},${origenLat};${destinoLng},${destinoLat}?overview=full&geometries=geojson`
            );
            const data = await response.json();
            const ruta = data.routes?.[0];

            if (!ruta) {
                throw new Error('Sin ruta disponible');
            }

            setRoute({
                id: marker.id,
                nombre: marker.region,
                coords: ruta.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
                distancia: formatDistance(ruta.distance),
                duracion: formatDuration(ruta.duration),
                aproximada: false,
            });
        } catch (error) {
            // Si el servicio de rutas no responde mostramos al menos la linea directa al punto.
            setRoute({
                id: marker.id,
                nombre: marker.region,
                coords: [userPosition, marker.position],
                distancia: formatDistance(L.latLng(userPosition).distanceTo(L.latLng(marker.position))),
                duracion: null,
                aproximada: true,
            });
        } finally {
            setRouteLoadingId(null);
        }
    };
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
            const response = await fetch("/api/reportes", {
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
            <div className="cora-map-panel">
                <h2 className="nature-title cora-map-panel-title">Cora Web</h2>

                <button
                    data-tour="location"
                    onClick={toggleLocation}
                    className={`cora-btn ${locationEnabled ? 'cora-btn--live' : 'cora-btn--teal'}`}
                >
                    {locationEnabled
                        ? 'Desactivar ubicación'
                        : 'Activar mi ubicación'}
                </button>

                {locationEnabled && (
                    <span className="cora-live-hint">
                        <span className="cora-live-dot" />
                        {userPosition
                            ? `En vivo${locationAccuracy ? ` · precisión ${Math.round(locationAccuracy)} m` : ''}`
                            : 'Buscando tu señal GPS...'}
                    </span>
                )}

                <button
                    data-tour="register"
                    onClick={() => setIsAddingMode(true)}
                    className={`cora-btn ${isAddingMode ? 'cora-btn--sage' : 'cora-btn--green'}`}
                >
                    Registrar punto de localización de residuos
                </button>
                {isAddingMode && (
                    <button
                        onClick={() => { setIsAddingMode(false); setTempMarker(null); setImages([]); setImageError(''); }}
                        className="cora-btn cora-btn--danger"
                    >
                        Cancelar / Terminar
                    </button>
                )}
            </div>

            {route && (
                <div className="cora-route-panel">
                    <div className="cora-route-head">
                        <strong>Ruta hacia el punto</strong>
                        <button
                            type="button"
                            className="cora-route-close"
                            onClick={() => setRoute(null)}
                            aria-label="Quitar ruta"
                        >
                            &times;
                        </button>
                    </div>
                    <p className="cora-route-dest">{route.nombre}</p>
                    <div className="cora-route-stats">
                        <span>{route.distancia}</span>
                        {route.duracion && <span>{route.duracion} caminando</span>}
                    </div>
                    {route.aproximada && (
                        <p className="cora-route-note">
                            Ruta aproximada en línea recta: el servicio de calles no respondió.
                        </p>
                    )}
                    <button type="button" className="cora-btn cora-btn--danger" onClick={() => setRoute(null)}>
                        Quitar ruta
                    </button>
                </div>
            )}

            <MapContainer 
                center={[9.9772, -84.1833]} 
                zoom={13} 
                minZoom={5} 
                maxBounds={bounds}
                maxBoundsViscosity={1.0}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FocusMap position={focusPosition} />

                <RecenterMap
                    position={userPosition}
                    disabled={skipLocationFly}
                />
                <MapEventsHandler onMapClick={handleMapClick} isActive={isAddingMode} />

                {route && (
                    <>
                        <Polyline
                            positions={route.coords}
                            pathOptions={{ color: '#04504F', weight: 8, opacity: 0.25 }}
                        />
                        <Polyline
                            positions={route.coords}
                            pathOptions={{ color: '#00978D', weight: 4, opacity: 0.95, dashArray: route.aproximada ? '8 8' : null }}
                        />
                        <FitRoute coords={route.coords} />
                    </>
                )}

                {/* precisión */}
                {userPosition && (
                    <Pane name="user-layer" style={{ zIndex: 1000 }}>
                        <Circle
                            center={userPosition}
                            radius={locationAccuracy || 50}
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
                        <Popup
                            className="cora-form-popup"
                            minWidth={480}
                            maxWidth={520}
                            onClose={() => { setTempMarker(null); setImages([]); setImageError(''); }}
                        >

                            <form onSubmit={handleFormSubmit} className="cora-form">
                                <strong className="cora-form-heading">Detalles del Reporte</strong>

                                <div className="cora-form-grid">
                                    <div className="cora-form-col">
                                        <label>Reportado por:</label>
                                        <input
                                            type="text"
                                            placeholder="Tu nombre"
                                            value={formData.name}
                                            disabled={!!perfil?.nombre}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />

                                        <label>Región:</label>
                                        <select
                                            value={formData.region}
                                            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
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
                                        <label>Tipo de residuo:</label>
                                        <select value={formData.wasteType} onChange={(e) => setFormData({ ...formData, wasteType: e.target.value })}>
                                            <option value="organico">Orgánico</option>
                                            <option value="plastico">Plástico</option>
                                            <option value="vidrio">Vidrio</option>
                                            <option value="metal">Envases metálicos</option>
                                            <option value="carton">Cartón</option>
                                            <option value="papel">Papel</option>
                                        </select>

                                        {/* Cantidad de Residuos */}
                                        <label>Cantidad de residuos:</label>
                                        <input
                                            type="number"
                                            placeholder="Cantidad"
                                            min="0"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        />

                                        {/* Pendiente */}
                                        <label>Pendiente:</label>
                                        <select value={formData.slope} onChange={(e) => setFormData({ ...formData, slope: e.target.value })}>
                                            <option value="plano">Plano</option>
                                            <option value="leve">Leve</option>
                                            <option value="pronunciada">Pronunciada</option>
                                            <option value="intensa">Intensa</option>
                                        </select>

                                        {/* Cercania a Cuerpos de agua */}
                                        <label>Cercanía al cuerpo de agua:</label>
                                        <select value={formData.waterProximity} onChange={(e) => setFormData({ ...formData, waterProximity: e.target.value })}>
                                            <option value="˂50m">˂50m</option>
                                            <option value="≥100m">≥100m</option>
                                            <option value="≥500m">≥500m</option>
                                        </select>

                                        {/* Riesgo de contaminación */}
                                        <label>Riesgo de contaminación:</label>
                                        <select value={formData.riskLevel} onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}>
                                            <option value="bajo">Bajo</option>
                                            <option value="medio">Medio</option>
                                            <option value="alto">Alto</option>
                                        </select>

                                        {/* Tipo de Material */}
                                        <label>El material clasifica como:</label>
                                        <select value={formData.materialType} onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}>
                                            <option value="reciclable">Reciclable</option>
                                            <option value="no reciclable">No reciclable</option>
                                        </select>
                                    </div>

                                    <div className="cora-form-col">
                                        <label>Evidencia fotográfica (máximo {MAX_IMAGES}):</label>
                                        <p className="cora-form-hint">
                                            Sube fotos del punto para que el reporte sea más exacto. AgenteCora revisa
                                            cada imagen en tu navegador y bloquea el contenido no adecuado.
                                        </p>

                                        <label className={`cora-dropzone ${images.length >= MAX_IMAGES ? 'cora-dropzone--full' : ''}`}>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                disabled={revisandoImagenes || images.length >= MAX_IMAGES}
                                                onChange={handleImageSelection}
                                            />
                                            <span className="cora-dropzone-icon">+</span>
                                            <span className="cora-dropzone-text">
                                                {images.length >= MAX_IMAGES
                                                    ? 'Ya alcanzaste el máximo de fotos'
                                                    : 'Toca para elegir tus fotos'}
                                            </span>
                                        </label>

                                        {revisandoImagenes && (
                                            <div className="cora-vision-status">
                                                AgenteCora está revisando la imagen...
                                            </div>
                                        )}

                                        {imageError && (
                                            <div className="cora-vision-error">{imageError}</div>
                                        )}

                                        {images.length > 0 && (
                                            <div className="cora-thumbs">
                                                {images.map((img, idx) => (
                                                    <div className="cora-thumb" key={idx}>
                                                        <img src={img.dataUrl} alt={`preview-${idx}`} />
                                                        <div className="cora-thumb-info">
                                                            <span className="cora-thumb-name">{img.name}</span>
                                                            <span className="cora-thumb-size">{(img.size / 1024).toFixed(1)} KB</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="cora-thumb-remove"
                                                            onClick={() => removeImage(idx)}
                                                            aria-label={`Eliminar ${img.name}`}
                                                        >
                                                            &times;
                                                        </button>
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
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={cargando || revisandoImagenes}
                                    className="cora-btn cora-btn--teal cora-form-submit"
                                >
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

                                <button
                                    type="button"
                                    className="cora-btn cora-btn--route"
                                    disabled={routeLoadingId === marker.id}
                                    onClick={() => verRuta(marker)}
                                >
                                    {routeLoadingId === marker.id ? 'Trazando ruta...' : 'Ver ruta hasta aquí'}
                                </button>
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

export default MyMapComponent;