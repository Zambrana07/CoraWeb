import React, { useState, useEffect } from "react";
import "../assets/styles/ProfileEditModal.css";

export default function ProfileEditModal({ open, onClose, initialName, initialAbout, initialImage, onSave }) {
  const [name, setName] = useState(initialName || "");
  const [about, setAbout] = useState(initialAbout || "");
  const [preview, setPreview] = useState(initialImage || null);
  const [fileData, setFileData] = useState(null);

  useEffect(() => {
    setName(initialName || "");
    setAbout(initialAbout || "");
    setPreview(initialImage || null);
    setFileData(null);
  }, [initialName, initialAbout, initialImage, open]);

  if (!open) return null;

  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
      setFileData(reader.result);
    };
    reader.readAsDataURL(f);
  };

  const handleSave = () => {
    onSave(name, about, fileData || preview);
  };

  return (
    <div className="pem-modal-overlay">
      <div className="pem-modal">
        <h3>Editar perfil</h3>

        <div className="pem-row">
          <label>Foto de perfil</label>
          <div className="pem-avatar-preview">
            {preview ? <img src={preview} alt="preview" /> : <div className="pem-avatar-placeholder">Sin imagen</div>}
          </div>
          <input type="file" accept="image/*" onChange={handleFile} />
        </div>

        <div className="pem-row">
          <label>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="pem-row">
          <label>Sobre mí</label>
          <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={4} />
        </div>

        <div className="pem-actions">
          <button className="pem-btn pem-cancel" onClick={onClose}>Cancelar</button>
          <button className="pem-btn pem-save" onClick={handleSave}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
