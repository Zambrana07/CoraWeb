/*
====================================================
POST CARD COMPONENT
====================================================

Responsabilidad:

Mostrar una publicación individual dentro
de la cuadrícula de publicaciones.

Incluye:

- Imagen de la publicación
- Título
- Descripción resumida
- Estado de verificación
- Controles administrativos

Este componente NO administra estados propios.

Toda la información y acciones son recibidas
mediante props desde el componente padre.

Esto permite reutilizar el mismo componente
para cualquier publicación.
*/

const PostCard = ({
  post,
  isAdmin,
  onView,
  onEdit,
  onDelete,
  onVerify,
}) => {
  const description = post.description ?? "";
  const summary =
    description.length > 80
      ? `${description.substring(0, 80)}...`
      : description;

  return (
    <article className="post-card">

      {/* ==========================================
          POST IMAGE
          ==========================================

          Muestra la imagen principal del post.

          Al hacer click se ejecuta la función
          onView para abrir una vista detallada
          de la publicación.
      */}

      <div
        className="post-image-container"
        onClick={() => onView(post)}
      >

        <img
          src={post.image_url}
          alt={post.title}
          className="post-image"
        />

        {/* ======================================
            VERIFIED BADGE
            ======================================

            Se muestra únicamente cuando la
            publicación está verificada.

            Sirve como indicador visual para
            destacar contenido aprobado.
        */}

        {post.verified && (
          <div className="post-verified-badge">
            ✓ Verificado
          </div>
        )}

      </div>

      {/* ==========================================
          POST INFORMATION
          ==========================================

          Muestra la información principal
          de la publicación.
      */}

      <div className="post-info">

        {/* Título de la publicación */}
        <h3>{post.title}</h3>

        {/* ==============================
            DESCRIPCIÓN RESUMIDA
            ==============================

            Si la descripción supera
            los 80 caracteres se corta
            automáticamente.

            Esto evita que tarjetas con
            textos largos rompan el diseño.
        */}

        <p>{summary}</p>

      </div>

      {/* ==========================================
          ADMIN CONTROLS
          ==========================================

          Solo visibles para administradores.

          Permiten gestionar la publicación
          directamente desde la tarjeta.
      */}

      {isAdmin && (

        <div className="post-admin-controls">

          {/* ==========================
              EDIT POST
              ==========================

              Solicita abrir el editor
              de la publicación.
          */}

          <button
            type="button"
            className="edit-btn"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(post);
            }}
          >
            Editar
          </button>

          {/* ==========================
              DELETE POST
              ==========================

              Solicita eliminar la
              publicación actual.

              Se envía únicamente el id
              porque es suficiente para
              identificar el registro.
          */}

          <button
            type="button"
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(post.id);
            }}
          >
            Borrar
          </button>

          {/* ==========================
              VERIFY POST
              ==========================

              Alterna el estado de
              verificación.

              Dependiendo del estado actual
              muestra una acción diferente.
          */}

          <button
            type="button"
            className="verify-btn"
            onClick={(e) => {
              e.stopPropagation();
              onVerify(post.id);
            }}
          >
            {post.verified
              ? "Unverify"
              : "Verify"}
          </button>

        </div>

      )}

    </article>
  );
};

export default PostCard;