import React from "react";
import "../assets/styles/Perfil.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useEffect, useState } from "react";
import ProfileEditModal from "../components/ProfileEditModal";
import CoraFeedbackModal from "../components/CoraFeedbackModal";
import usr_img from "../assets/img/usr_unk.jpeg";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import ArchiveIcon from "../assets/img/icons/box-archive-solid-full.svg";
import CertificateIcon from "../assets/img/icons/certificate-solid-full.svg";




function MiniMap({ position }) {
  const navigate = useNavigate();

  if (!position) return null;

  const handleClick = () => {
    navigate("/", {
      state: {
        focus: position,
        skipLocationFly: true
      }
    });
  };

  return (
    <div
      onClick={handleClick}
      className="mini-map-wrapper"
    >
      <MapContainer
        center={position}
        zoom={15}
        className="leaflet-map"
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={position} />
      </MapContainer>
    </div>
  );
}

function Profile() {
  const USER_ID = JSON.parse(localStorage.getItem("user")).id;
  const USER_ROL = JSON.parse(localStorage.getItem("user")).rol;
  const navigate = useNavigate();

  let verifiedPosts = 0;

  const [feedback, setFeedback] = useState(null);
  const closeFeedback = () => setFeedback(null);
  const showFeedback = (payload) => setFeedback(payload);

  const [posts, setPosts] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [nombre, setNombre] = useState("");
  const [aboutme, setAboutme] = useState("");
  const [BannerImage, setBannerImage] = useState("");
const [editando, setEditando] = useState(false);
const [showEditModal, setShowEditModal] = useState(false);
  useEffect(() => {
    cargarPerfil();
  }, []);

  useEffect(() => {
    fetch("http://localhost:3000/api/nature-image")
      .then((r) => r.json())
      .then((data) => setBannerImage(data.image));
  }, []);

  const eliminarPost = async (postId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/reportes/${postId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuarioId: USER_ID,
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.message || "No se pudo eliminar el reporte");
      }

      setPosts((prev) => prev.filter((post) => post.id !== postId));
      showFeedback({
        variant: 'success',
        title: 'Reporte eliminado',
        message: 'Reporte eliminado correctamente.',
        confirmLabel: 'Perfecto'
      });
    } catch (error) {
      console.error(error);
      showFeedback({
        variant: 'error',
        title: 'Error al eliminar',
        message: 'Error al eliminar el reporte: ' + error.message,
        confirmLabel: 'Entendido'
      });
    }
  };

  const requestDeletePost = (postId) => {
    showFeedback({
      variant: 'confirm',
      title: 'Eliminar reporte',
      message: '¿Deseas eliminar este reporte?',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      onConfirm: () => eliminarPost(postId),
    });
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

      console.log("Perfil cargado:", data);

      setPerfil(data.perfil);
      setNombre(data.perfil.nombre);
      setAboutme(data.perfil.aboutme || "");
    } catch (error) {
      console.error(error);
    }
  }
  async function guardarPerfil(perfil_img, newNombre, newAbout) {
    try {
      const payload = {
        id: USER_ID,
        nombre: newNombre ?? nombre,
        aboutme: newAbout ?? aboutme,
      };

      if (perfil_img) payload.perfil_img = perfil_img;

      const response = await fetch(
        "http://localhost:3000/api/perfil",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (data.ok) {
        setEditando(false);
        cargarPerfil();
        showFeedback({
          variant: 'success',
          title: 'Perfil actualizado',
          message: 'Los cambios en tu perfil se guardaron correctamente.',
          confirmLabel: 'Perfecto'
        });
      }
    }
    catch (err) {
      console.error(err);
    }
  }


  useEffect(() => {
    if (perfil) {
      cargarPostsBackend();
    }
  }, [perfil]);

  async function cargarPostsBackend() {
    try {
      const response = await fetch(`http://localhost:3000/api/reportes?usuarioId=${USER_ID}`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.message || "Error al cargar reportes");
      }

      const postsBackend = data.reportes.map((reporte, index) => ({
        id: reporte.id,
        index,
        verified: reporte.verificado || false,
        position: [reporte.latitud, reporte.longitud],
        name: reporte.reportado_por || "Anónimo",
        region: reporte.region_name || reporte.region_id || "Sin región",
        wasteType: reporte.tipo_residuo,
        amount: reporte.cantidad,
        slope: reporte.pendiente,
        waterProximity: reporte.cercania_agua,
        riskLevel: reporte.riesgo_contaminacion,
        materialType: reporte.clasificacion_material,
        imagenes: reporte.imagenes || [],
        timestamp: reporte.fecha_creacion
          ? new Date(reporte.fecha_creacion).toLocaleTimeString()
          : new Date().toLocaleTimeString(),
      }));

      setPosts(postsBackend);
    } catch (error) {
      console.error("Error cargando posts desde backend:", error);
    }
  }


  // Contar los verificados
  for (let i = 0; i < posts.length; i++) {
    if (posts[i].verified === true) {
      verifiedPosts++;
    }
  }

  console.log("Posts verificados:", verifiedPosts);
  return (
    <div className="profile-container page-transition">
      <div className="header" style={{ backgroundImage: `url(${BannerImage})` }}>
        <div className="avatar">
          <img
            src={perfil?.perfil_img ?? usr_img}
            alt="Avatar"
          />
        </div>
        <button className="edit-profile-btn"
          onClick={() => setShowEditModal(true)}
        >
          Editar perfil
        </button>
        <button
          onClick={() => {
            localStorage.clear(); 
            navigate("/login");   
          }}
          style={{
            margin: "10px",
            padding: "8px 12px",
            background: "red",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          🧹 Borrar localStorage (debug)
        </button>

        <div className="stats">
          <div>
            <strong>{posts.length}</strong>
            <span>Posts</span>
          </div>
          <div>
            <strong>{verifiedPosts}</strong>
            <span>Verificados</span>
          </div>
        </div>
      </div>

      <div className="content">
        <h1 className="nature-title">
          {perfil ? perfil.nombre : "Cargando..."}

          {USER_ROL === 2 && (
            <img src={CertificateIcon} id="cora-logo-admin" alt="Logo rol 2" />
          )}
        </h1>
        <section>
          <h2 className="aboutme">Sobre Mí</h2>
          <p>
            {!perfil
              ? "Cargando..."
              : perfil.aboutme || "No hay descripción disponible"}
          </p>
        </section>

        <ProfileEditModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          initialName={nombre}
          initialAbout={aboutme}
          initialImage={perfil?.perfil_img}
          onSave={(newName, newAbout, newImg) => {
            guardarPerfil(newImg, newName, newAbout).then(() => {
              setNombre(newName);
              setAboutme(newAbout);
            });
            setShowEditModal(false);
          }}
        />
        <section>
          <h2 className="nature-title">Publicados</h2>
          <div className="posts-grid">
            {perfil && posts.length === 0 ? (
              <div className="no-posts-message">
                Tu cuenta no tiene posts asociados.
              </div>
            ) : (
              posts.map((post, index) => (
                <div className="post-card" key={index}>
                  <div className={`verification-status ${post.verified ? 'verified' : 'unverified'}`}>
                    {post.verified ? 'Verificado' : 'No verificado'}
                  </div>

                  <div className="mini-map-wrapper">
                    <MiniMap position={post.position} />
                  </div>

                  {post.imagenes && post.imagenes.length > 0 && (
                    <div className="post-images-grid">
                      {post.imagenes.slice(0, 3).map((src, idx) => (
                        <img
                          key={idx}
                          src={src}
                          alt={`Imagen reporte ${post.id} ${idx + 1}`}
                          className="post-image-preview"
                        />
                      ))}
                    </div>
                  )}

                  <div className="post-info">
                    <h3 className="post-title">
                      Reporte de {post.wasteType} en {post.region}
                    </h3>

                    <p className="post-description">
                      Se detectó una acumulación de <strong>{post.amount}</strong> de residuos
                      clasificados como <strong>{post.materialType}</strong>. El área presenta una
                      pendiente <strong>{post.slope}</strong> y una cercanía al agua de nivel{" "}
                      <strong>{post.waterProximity}</strong>, lo que genera un riesgo de
                      contaminación <strong>{post.riskLevel}</strong>.
                    </p>

                    <div className="post-footer">
                      <span>👤 {post.name}</span>
                      <span>📅 {post.timestamp}</span>
                    </div>
                  </div>

                  <div className="post-actions">
                    <span>✎</span>
                    {!post.verified ? (
                      <span
                        style={{ cursor: "pointer" }}
                        onClick={() => requestDeletePost(post.id)}
                      >
                        🗑
                      </span>
                    ) : null}
                  </div>

                  <div
                    className="post-archive"
                    onClick={() =>
                      navigate("/archivero", {
                        state: {
                          pointId: post.id,
                        },
                      })
                    }
                  >
                    <img
                      className="archive-icon"
                      src={ArchiveIcon}
                      alt="Archivar"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      {feedback && (
        <CoraFeedbackModal
          open={!!feedback}
          variant={feedback.variant}
          title={feedback.title}
          message={feedback.message}
          confirmLabel={feedback.confirmLabel}
          cancelLabel={feedback.cancelLabel}
          onConfirm={feedback.onConfirm}
          onClose={closeFeedback}
          loading={feedback.loading || false}
        />
      )}
    </div>
  );
};

export default Profile;