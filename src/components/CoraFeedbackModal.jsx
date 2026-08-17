/**
 * CoraFeedbackModal.jsx — diálogo reutilizable (sustituye alert() nativo).
 *
 * Variantes:
 *   success  → mensaje de "todo bien"
 *   error    → algo falló
 *   warning  → aviso (falta un campo, etc.)
 *   confirm  → pregunta sí/no: Cancelar cierra; el botón rojo ejecuta onConfirm
 *
 * En success/error/warning, un clic en el fondo oscuro también cierra.
 * Lo usan el mapa, el perfil y el Archivero.
 */
import logo from "../assets/img/CoraLogo.png";
import "../assets/styles/CoraFeedbackModal.css";

const ICONS = {
  success: "\u2713",
  error: "!",
  warning: "i",
  confirm: "?",
};

export default function CoraFeedbackModal({
  open,
  variant = "success",
  title,
  message,
  confirmLabel = "Entendido",
  cancelLabel = "Cancelar",
  onConfirm,
  onClose,
  loading = false,
}) {
  if (!open) return null;

  const isConfirm = variant === "confirm";
  // Color del botón principal según el tipo de mensaje.
  const primaryClass =
    variant === "success"
      ? "cora-feedback-btn--success"
      : variant === "confirm" || variant === "error"
        ? "cora-feedback-btn--danger"
        : "cora-feedback-btn--primary";

  const handlePrimary = async () => {
    if (isConfirm && onConfirm) {
      await onConfirm();
      onClose?.();
      return;
    }
    onClose?.();
  };

  return (
    <div
      className="cora-feedback-overlay"
      onClick={isConfirm ? undefined : onClose}
      role="presentation"
    >
      {/* stopPropagation: un clic dentro de la tarjeta no cierra el overlay. */}
      <div
        className="cora-feedback-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cora-feedback-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cora-feedback-header">
          <img src={logo} alt="Cora Web" className="cora-feedback-logo" />
          <div className={`cora-feedback-icon cora-feedback-icon--${variant}`}>
            {ICONS[variant] || ICONS.success}
          </div>
          <h2 id="cora-feedback-title" className="cora-feedback-title nature-title">
            {title}
          </h2>
        </header>

        <p className="cora-feedback-message">{message}</p>

        <div
          className={`cora-feedback-actions ${isConfirm ? "cora-feedback-actions--row" : ""
            }`}
        >
          {isConfirm && (
            <button
              type="button"
              className="cora-feedback-btn cora-feedback-btn--ghost"
              onClick={onClose}
              disabled={loading}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={`cora-feedback-btn ${primaryClass}`}
            onClick={handlePrimary}
            disabled={loading}
          >
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
