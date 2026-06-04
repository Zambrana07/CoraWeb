import { WASTE_LABELS } from "../../lib/reportesMapper";

const PostCard = ({
  post,
  isAdmin,
  onView,
  onEdit,
  onDelete,
  onVerify,
}) => {
  const imageSrc = post.image_url;

  return (
    <article className={`post-card${post.fromMap ? " post-card--map" : ""}`}>
      <div
        className="post-image-container"
        onClick={() => onView(post)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onView(post);
        }}
      >
        {imageSrc ? (
          <img src={imageSrc} alt={post.title} className="post-image" />
        ) : (
          <div className="post-image post-image--placeholder" />
        )}

        {post.verified && (
          <div className="post-verified-badge" aria-label="Verificado">
            ✓
          </div>
        )}

        {post.fromMap && post.analysis?.valid && (
          <div
            className="post-risk-badge"
            style={{ "--risk-hex": post.analysis.hex }}
          >
            {post.analysis.nivel}
          </div>
        )}

        {isAdmin && (
          <div className="post-card-overlay" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="overlay-btn" onClick={() => onEdit(post)}>
              Editar
            </button>
            <button
              type="button"
              className="overlay-btn overlay-btn--verify"
              onClick={() => onVerify(post.id)}
            >
              {post.verified ? "Quitar" : "Verificar"}
            </button>
            <button
              type="button"
              className="overlay-btn overlay-btn--delete"
              onClick={() => onDelete(post.id)}
            >
              Borrar
            </button>
          </div>
        )}
      </div>

      {post.fromMap && (
        <p className="post-grid-caption">
          {WASTE_LABELS[post.wasteType] || post.wasteType}
          {post.amount != null && post.amount !== "" ? ` · ${post.amount}` : ""}
        </p>
      )}
    </article>
  );
};

export default PostCard;
