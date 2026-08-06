import { useEffect, useRef, useState } from "react";

const PfStats = ({
  perfil,
  isAdmin,
  setPerfil,
  verifiedCount,
  totalPosts,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(perfil.name);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!editingName) {
      setNewName(perfil.name);
    }
  }, [perfil.name, editingName]);

  const handleNameSave = () => {
    setPerfil((prev) => ({ ...prev, name: newName }));
    setEditingName(false);
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    if (perfil.profileImage?.startsWith("blob:")) {
      URL.revokeObjectURL(perfil.profileImage);
    }
    setPerfil((prev) => ({ ...prev, profileImage: imageUrl }));
  };

  return (
    <section className="profile-hero">
      <div className="profile-banner">
        <div className="profile-avatar-wrap">
          <img
            src={perfil.profileImage}
            alt={perfil.name}
            className="profile-image"
          />
          {isAdmin && (
            <>
              <button
                type="button"
                className="change-image-btn profile-avatar-edit"
                onClick={() => fileInputRef.current?.click()}
              >
                Cambiar foto
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                hidden
                onChange={handleImageChange}
              />
            </>
          )}
        </div>

        <div className="profile-stats-float">
          <div className="stat-card stat-card--verified">
            <h2>{verifiedCount}</h2>
            <p>Verificados</p>
          </div>
          <div className="stat-card stat-card--posts">
            <h2>{totalPosts}</h2>
            <p>Publicados</p>
          </div>
        </div>
      </div>

      <div className="profile-name-block">
        {!editingName ? (
          <>
            <h1 className="profile-display-name">{perfil.name}</h1>
            {isAdmin && (
              <button
                type="button"
                className="edit-btn profile-name-edit"
                onClick={() => setEditingName(true)}
              >
                Editar nombre
              </button>
            )}
          </>
        ) : (
          <div className="edit-name-container">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={50}
            />
            <button type="button" className="save-btn" onClick={handleNameSave}>
              Guardar
            </button>
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                setNewName(perfil.name);
                setEditingName(false);
              }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default PfStats;
