import { useEffect, useState } from "react";
import {
  WASTE_LABELS,
  RISK_LABELS,
} from "../../lib/reportesMapper";

const WASTE_OPTIONS = Object.keys(WASTE_LABELS);
const RISK_OPTIONS = Object.keys(RISK_LABELS);

const PostModal = ({
  isOpen,
  onClose,
  mode,
  post,
  onSave,
  saving = false,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [wasteType, setWasteType] = useState("organico");
  const [amount, setAmount] = useState("");
  const [riskLevel, setRiskLevel] = useState("bajo");

  useEffect(() => {
    if (!post) return;
    setTitle(post.title || "");
    setDescription(post.description || "");
    setImagePreview(post.image_url || "");
    setSelectedFile(null);
    setName(post.name || "");
    setRegion(post.region || "");
    setWasteType(post.wasteType || "organico");
    setAmount(post.amount != null ? String(post.amount) : "");
    setRiskLevel(post.riskLevel || "bajo");
  }, [post]);

  if (!isOpen) return null;

  const isViewMode = mode === "view";
  const isMapPost = Boolean(post?.fromMap);
  const displayImage = post?.image_url || imagePreview;

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(preview);
  };

  const handleSubmit = () => {
    if (!post) return;

    const base = {
      ...post,
      title: title.trim(),
      description: description.trim(),
      image_url: imagePreview,
      imageFile: selectedFile,
    };

    if (isMapPost) {
      onSave({
        ...base,
        name: name.trim(),
        region: region.trim(),
        wasteType,
        amount: amount === "" ? 0 : Number(amount),
        riskLevel,
      });
      return;
    }

    onSave(base);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="post-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="close-modal-btn"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>

        {displayImage && !isMapPost && (
          <div className="modal-image-container">
            <img src={displayImage} alt={title} className="modal-image" />
          </div>
        )}

        <div className="modal-content">
          {isViewMode ? (
            <>
              <h2>{isMapPost ? post.name : title}</h2>

              {isMapPost && (
                <dl className="modal-map-details">
                  <div>
                    <dt>Región</dt>
                    <dd>{post.region || "—"}</dd>
                  </div>
                  <div>
                    <dt>Tipo de residuo</dt>
                    <dd>
                      {WASTE_LABELS[post.wasteType] || post.wasteType || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Cantidad</dt>
                    <dd>
                      {post.amount !== undefined && post.amount !== ""
                        ? post.amount
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Riesgo</dt>
                    <dd>
                      {RISK_LABELS[post.riskLevel] || post.riskLevel || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Fecha</dt>
                    <dd>{post.timestamp || "—"}</dd>
                  </div>
                  {post.analysis?.valid && (
                    <div
                      className="modal-agentecora"
                      style={{ "--risk-hex": post.analysis.hex }}
                    >
                      <dt>AgenteCora</dt>
                      <dd>
                        {post.analysis.nivel} ({post.analysis.score}/100)
                      </dd>
                    </div>
                  )}
                </dl>
              )}

              <p className="modal-description">{description}</p>

              {post?.verified && (
                <span className="verified-badge">✓ Verificado</span>
              )}
            </>
          ) : isMapPost ? (
            <>
              <h2>Editar reporte</h2>
              <label className="modal-field">
                <span>Nombre</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                />
              </label>
              <label className="modal-field">
                <span>Región</span>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  maxLength={120}
                />
              </label>
              <label className="modal-field">
                <span>Tipo de residuo</span>
                <select
                  value={wasteType}
                  onChange={(e) => setWasteType(e.target.value)}
                >
                  {WASTE_OPTIONS.map((key) => (
                    <option key={key} value={key}>
                      {WASTE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="modal-field">
                <span>Cantidad</span>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <label className="modal-field">
                <span>Riesgo</span>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value)}
                >
                  {RISK_OPTIONS.map((key) => (
                    <option key={key} value={key}>
                      {RISK_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="save-btn"
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
                <button type="button" className="cancel-btn" onClick={onClose}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <textarea
                placeholder="Descripción"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
              />
              <input type="file" accept="image/*" onChange={handleImageSelect} />
              <div className="modal-actions">
                <button
                  type="button"
                  className="save-btn"
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
                <button type="button" className="cancel-btn" onClick={onClose}>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostModal;
