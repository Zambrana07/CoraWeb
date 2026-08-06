import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import CoraFeedbackModal from "../components/CoraFeedbackModal";
import "../assets/styles/ArchiveroPage.css";
import basura1 from "../assets/img/basura1.jpg";
import basura2 from "../assets/img/basura2.jpg";
import basura3 from "../assets/img/basura3.webp";
import { analyzeReport } from "../agent/agenteCora";
import "../assets/styles/AgenteCora.css";
import { supabase } from "../lib/supabaseClient";

const imagePool = [basura1, basura2, basura3];
const allowedRegions = ["Colegio CTP CIT", "Soda armonia"];

const defaultDescription = (name, region, verified) =>
  `${name} es un punto de recoleccion en ${region}. ${verified
    ? "Este punto ha sido verificado por la comunidad."
    : "Este punto no ha sido verificado por la comunidad."
  }`;
const hashStringToIndex = (value, modulo) => {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
};

// Comentarios ahora se persisten en el backend (tabla comentarios)
const fetchCommentsFromApi = async (pointId) => {
  try {
    const res = await fetch(`/api/reportes/${pointId}/comentarios`);
    if (!res.ok) {
      const text = await res.text();
      console.error('fetchComments non-ok response:', res.status, text);
      return [];
    }

    const data = await res.json();
    if (!data.ok) return [];
    return data.comentarios.map((c) => ({
      id: c.id,
      author: c.usuario_nombre || 'Anonimo',
      text: c.comentario,
      createdAt: c.fecha_creacion,
    }));
  } catch (err) {
    console.error('Error fetching comments:', err);
    return [];
  }
};

const carouselSections = ["Principal", "Puntos frecuentes", "Agregados recientemente"];
const regionOptions = allowedRegions;
const getItemsPerView = () => {
  if (window.innerWidth <= 640) {
    return 1;
  }
  if (window.innerWidth <= 900) {
    return 2;
  }
  return 3;
};

function formatReporte(reporte) {
  const region = allowedRegions.includes(reporte.region_name)
    ? reporte.region_name
    : "Colegio CTP CIT";

  const name = reporte.reportado_por ? `Reporte de ${reporte.reportado_por}` : "Reporte sin nombre";
  const createdAt = reporte.fecha_creacion ? new Date(reporte.fecha_creacion).getTime() : null;

  const point = {
    id: reporte.id,
    name,
    region,
    imagenes: reporte.imagenes || [],
    image: (reporte.imagenes && reporte.imagenes.length > 0)
      ? reporte.imagenes[0]
      : imagePool[hashStringToIndex(reporte.id, imagePool.length)],
    wasteType: reporte.tipo_residuo,
    verified: reporte.verificado || false,
    amount: reporte.cantidad,
    slope: reporte.pendiente,
    waterProximity: reporte.cercania_agua,
    riskLevel: reporte.riesgo_contaminacion,
    materialType: reporte.clasificacion_material,
    position: reporte.latitud != null && reporte.longitud != null ? [reporte.latitud, reporte.longitud] : null,
    createdAt,
  };

  point.description = defaultDescription(point.name, region, point.verified);
  point.analysis = analyzeReport(point);
  return point;
}

function PointDetailModal({ point, onClose }) {
  const [commentAuthor, setCommentAuthor] = useState("");
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const closeFeedback = () => setFeedback(null);
  const showFeedback = (payload) => setFeedback(payload);
  const USER_ID = JSON.parse(localStorage.getItem("user")).id;
  const USER_ROL = JSON.parse(localStorage.getItem("user")).rol;

  useEffect(() => {
    const cargarPerfil = async () => {
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

        if (data.perfil) {
          setPerfil(data.perfil);
          setCommentAuthor(data.perfil.nombre || "");
        }
      } catch (error) {
      }
    };

    cargarPerfil();
  }, [USER_ID]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    // cargar comentarios desde backend
    (async () => {
      const loaded = await fetchCommentsFromApi(point.id);
      setComments(loaded);
    })();

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, point.id]);

  const handleSubmitComment = (event) => {
    event.preventDefault();
    const text = commentText.trim();
    const author = commentAuthor.trim() || "Anonimo";
    if (!text) return;

    (async () => {
      try {
        const res = await fetch(`/api/reportes/${point.id}/comentarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuarioId: USER_ID, comentario: text }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`HTTP ${res.status}: ${txt}`);
        }
        const data = await res.json();
        if (!data.ok) throw new Error(data.message || 'Error creando comentario');

        const created = data.comentario;
        const newComment = {
          id: created.id,
          author: created.usuario_nombre || author,
          text: created.comentario,
          createdAt: created.fecha_creacion,
        };

        setComments((c) => [newComment, ...c]);
        setCommentText("");
      } catch (err) {
        console.error('Error creando comentario:', err);
        showFeedback({
          variant: 'error',
          title: 'Error al comentar',
          message: 'No se pudo publicar el comentario',
          confirmLabel: 'Entendido'
        });
      }
    })();
  };

  return (
    <div className="archivero-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="archivero-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="archivero-modal-title"
      >
        <button type="button" className="archivero-modal-close" onClick={onClose} aria-label="Cerrar">
          <span aria-hidden="true">&times;</span>
        </button>

        <div className="archivero-modal-hero">
          <img className="archivero-modal-image" src={point.image} alt={point.name} />
          <div className="archivero-modal-hero-overlay" />
          <span className="archivero-modal-region-badge">{point.region}</span>
        </div>

        

        <div className="archivero-modal-body">
          {point.imagenes && point.imagenes.length > 1 && (
          <div className="archivero-modal-gallery">
            {point.imagenes.slice(0, 4).map((src, idx) => (
              <img
                key={idx}
                className="archivero-modal-thumb"
                src={src}
                alt={`Imagen ${idx + 2} de ${point.name}`}
              />
            ))}
          </div>
        )}
          <header className="archivero-modal-header">
            <h2 id="archivero-modal-title" className="archivero-modal-title nature-title">
              {point.name}
            </h2>
            <p className="archivero-modal-description">
              {point.description || defaultDescription(point.name, point.region)}
            </p>
          </header>

          {(point.wasteType || point.amount || point.slope || point.waterProximity || point.riskLevel || point.materialType) && (
            <ul className="archivero-modal-details">
              {point.wasteType && (
                <li><strong>Tipo de residuo:</strong> {point.wasteType}</li>
              )}
              {point.amount !== undefined && point.amount !== null && point.amount !== "" && (
                <li><strong>Cantidad:</strong> {point.amount}</li>
              )}
              {point.slope && (
                <li><strong>Pendiente:</strong> {point.slope}</li>
              )}
              {point.waterProximity && (
                <li><strong>Cercania al cuerpo de agua:</strong> {point.waterProximity}</li>
              )}
              {point.riskLevel && (
                <li><strong>Riesgo de contaminacion:</strong> {point.riskLevel}</li>
              )}
              {point.materialType && (
                <li><strong>Material:</strong> {point.materialType}</li>
              )}
            </ul>
          )}

          {point.analysis?.valid && (
            <div className="cora-form-risk" style={{ "--risk-hex": point.analysis.hex }}>
              <strong>AgenteCora: Riesgo {point.analysis.nivel} ({point.analysis.score}/100)</strong>
              {point.analysis.recomendacion}
            </div>
          )}

          <section className="archivero-comments">
            <h3 className="archivero-comments-title nature-title">
              Comentarios
              <span className="archivero-comments-count">{comments.length}</span>
            </h3>
            <form className="archivero-comment-form" onSubmit={handleSubmitComment}>
              <input
                type="text"
                className="archivero-comment-input"
                placeholder="Tu nombre"
                value={commentAuthor}
                readOnly={!!perfil?.nombre}
                style={
                  perfil?.nombre
                    ? {
                      backgroundColor: "#f3f4f6",
                      color: "#666",
                      cursor: "default",
                      border: "1px solid #d1d5db"
                    }
                    : {}
                }
              />
              <textarea
                className="archivero-comment-textarea"
                placeholder="Escribe tu opinion sobre este punto..."
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                rows={3}
                required
              />
              <button type="submit" className="archivero-comment-submit">
                Publicar comentario
              </button>
            </form>
            <ul className="archivero-comments-list">
              {comments.length === 0 ? (
                <li className="archivero-comments-empty">Se el primero en comentar este punto.</li>
              ) : (
                comments.map((comment) => (
                  <li className="archivero-comment-item" key={comment.id}>
                    <div className="archivero-comment-header">
                      <strong>{comment.author}</strong>
                      <time dateTime={comment.createdAt}>
                        {new Date(comment.createdAt).toLocaleString("es-CR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </time>
                    </div>
                    <p>{comment.text}</p>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function ArchiveroPage() {
  const location = useLocation();

  const targetPointId = location.state?.pointId;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [itemsPerView, setItemsPerView] = useState(getItemsPerView);
  const [carouselIndexes, setCarouselIndexes] = useState(() =>
    Object.fromEntries(carouselSections.map((sectionTitle) => [sectionTitle, 0])),
  );
  const [firebasePoints, setFirebasePoints] = useState([]);

  useEffect(() => {
    if (!targetPointId || firebasePoints.length === 0) return;

    const point = firebasePoints.find(
      (p) => p.id === targetPointId
    );

    if (point) {
      setSelectedPoint(point);
    }
  }, [targetPointId, firebasePoints]);

  useEffect(() => {
    const cargarPuntos = async () => {
      try {
        const response = await fetch("/api/reportes");
        const data = await response.json();

        if (!data.ok) {
          throw new Error(data.message || "Error al cargar puntos");
        }

        const puntos = data.reportes.map((reporte) => {
          const region = allowedRegions.includes(reporte.region_name)
            ? reporte.region_name
            : "Colegio CTP CIT";

          const name = reporte.reportado_por ? `Reporte de ${reporte.reportado_por}` : "Reporte sin nombre";
          const createdAt = reporte.fecha_creacion ? new Date(reporte.fecha_creacion).getTime() : null;

          const point = {
            id: reporte.id,
            name,
            region,
            imagenes: reporte.imagenes || [],
            image: (reporte.imagenes && reporte.imagenes.length > 0)
              ? reporte.imagenes[0]
              : imagePool[hashStringToIndex(reporte.id, imagePool.length)],
            wasteType: reporte.tipo_residuo,
            verified: reporte.verificado || false,
            amount: reporte.cantidad,
            slope: reporte.pendiente,
            waterProximity: reporte.cercania_agua,
            riskLevel: reporte.riesgo_contaminacion,
            materialType: reporte.clasificacion_material,
            position: reporte.latitud != null && reporte.longitud != null ? [reporte.latitud, reporte.longitud] : null,
            createdAt,
          };

          point.description = defaultDescription(point.name, region, point.verified);
          point.analysis = analyzeReport(point);
          return point;
        });

        puntos.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setFirebasePoints(puntos);
      } catch (error) {
      }
    };

    cargarPuntos();

    const channel = supabase
      .channel('reportes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reportes' }, (payload) => {
        const eventType = payload.eventType || payload.event || payload.type;
        const reporte = payload.record || payload.new || null;
        const oldReporte = payload.old_record || payload.old || null;

        if (eventType === 'INSERT' && reporte?.id) {
          setFirebasePoints((current) => {
            const nuevo = formatReporte(reporte);
            return [nuevo, ...current.filter((item) => item.id !== nuevo.id)];
          });
        }
        if (eventType === 'UPDATE' && reporte?.id) {
          setFirebasePoints((current) =>
            current.map((item) => (item.id === reporte.id ? formatReporte(reporte) : item))
          );
        }
        if (eventType === 'DELETE' && oldReporte?.id) {
          setFirebasePoints((current) => current.filter((item) => item.id !== oldReporte.id));
        }
      });

    channel.subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const mergedPoints = firebasePoints;

  const filteredPoints = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    return mergedPoints.filter((point) => {
      const matchesSearch = !normalizedTerm || point.name.toLowerCase().includes(normalizedTerm);
      const matchesRegion = selectedRegion === "all" || point.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [searchTerm, selectedRegion, mergedPoints]);

  useEffect(() => {
    const handleResize = () => setItemsPerView(getItemsPerView());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const maxStartIndex = Math.max(0, filteredPoints.length - itemsPerView);
    setCarouselIndexes((current) =>
      Object.fromEntries(
        carouselSections.map((sectionTitle) => [sectionTitle, Math.min(current[sectionTitle] || 0, maxStartIndex)]),
      ),
    );
  }, [filteredPoints.length, itemsPerView]);

  const maxStartIndex = Math.max(0, filteredPoints.length - itemsPerView);
  const moveCarousel = (sectionTitle, direction) => {
    setCarouselIndexes((current) => {
      const currentIndex = current[sectionTitle] || 0;
      const nextIndex = Math.min(maxStartIndex, Math.max(0, currentIndex + direction));
      return { ...current, [sectionTitle]: nextIndex };
    });
  };

  return (
    <div className="archivero-page page-transition">
      <div className="archivero-page-content">
        <div className="archivero-search-wrap">
          <input
            className="archivero-search"
            type="search"
            placeholder="Buscar punto..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            className="archivero-region-filter"
            value={selectedRegion}
            onChange={(event) => setSelectedRegion(event.target.value)}
          >
            <option value="all">Todas las regiones</option>
            {regionOptions.map((region) => (
              <option value={region} key={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        <h1 className="archivero-page-title nature-title">
          Archivero-Cora
        </h1>

        {carouselSections.map((sectionTitle) => (
          <section className="archivero-section" key={sectionTitle}>
            <h2 className="archivero-section-title nature-title">{sectionTitle}</h2>
            <div className="archivero-carousel-base">
              <button
                className="archivero-carousel-btn"
                type="button"
                aria-label="Anterior"
                onClick={() => moveCarousel(sectionTitle, -1)}
                disabled={carouselIndexes[sectionTitle] === 0}
              >
                {"<"}
              </button>
              <div className="archivero-carousel-track">
                <div
                  className="archivero-carousel-slider"
                  style={{
                    transform: `translateX(-${(carouselIndexes[sectionTitle] * 100) / itemsPerView}%)`,
                    "--items-per-view": itemsPerView,
                  }}
                >
                  {filteredPoints.map((point) => (
                    <button
                      type="button"
                      className="archivero-carousel-item"
                      key={`${sectionTitle}-${point.id}`}
                      onClick={() => setSelectedPoint(point)}
                      style={point.analysis?.valid ? { borderBottom: `5px solid ${point.analysis.hex}` } : undefined}
                    >
                      <img className="archivero-carousel-image" src={point.image} alt={point.name} />
                      <span>{point.name}</span>
                      <small className="archivero-item-region">{point.region}</small>
                      {point.analysis?.valid && (
                        <span className="archivero-risk-pill" style={{ background: point.analysis.hex }}>
                          Riesgo {point.analysis.nivel}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="archivero-carousel-btn"
                type="button"
                aria-label="Siguiente"
                onClick={() => moveCarousel(sectionTitle, 1)}
                disabled={carouselIndexes[sectionTitle] >= maxStartIndex}
              >
                {">"}
              </button>
            </div>
          </section>
        ))}

        <h2 className="archivero-all-title nature-title">Todos los puntos</h2>
        <div className="archivero-list">
          {filteredPoints.map((point) => (
            <button
              type="button"
              className="archivero-list-item"
              key={point.id}
              onClick={() => setSelectedPoint(point)}
              style={point.analysis?.valid ? { borderLeft: `6px solid ${point.analysis.hex}` } : undefined}
            >
              <img className="archivero-list-image" src={point.image} alt={point.name} />
              <div className="archivero-list-text">
                <span className="archivero-list-name">{point.name}</span>
                <small className="archivero-item-region">{point.region}</small>
              </div>
              {point.analysis?.valid && (
                <span className="archivero-risk-pill" style={{ background: point.analysis.hex }}>
                  Riesgo {point.analysis.nivel}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      {selectedPoint && (
        <PointDetailModal point={selectedPoint} onClose={() => setSelectedPoint(null)} />
      )}
    </div>
  );
}

export default ArchiveroPage;
