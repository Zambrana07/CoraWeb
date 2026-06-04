/*
====================================================
POSTS GRID COMPONENT
====================================================

Responsabilidad:

Administrar todas las publicaciones del perfil.

Funciones principales:

- Mostrar publicaciones
- Crear publicaciones
- Editar publicaciones
- Eliminar publicaciones
- Verificar publicaciones
- Abrir y cerrar el modal

Este componente actúa como intermediario entre:

PostCard  -> Interacciones del usuario
PostModal -> Formulario de edición
Perfil    -> Estado global de publicaciones

Por esta razón contiene la mayor parte de la
lógica relacionada con los posts.
*/

import { useState } from "react";

import PostCard from "./postcard";
import PostModal from "./postModal";

const PostsGrid = ({
  posts,
  setPosts,
  isAdmin,
}) => {

  /*
  ====================================================
  SELECTED POST
  ====================================================

  Almacena la publicación actualmente
  seleccionada.

  Se utiliza para:

  - Ver detalles
  - Editar publicaciones
  - Cargar información en el modal
  */

  const [selectedPost, setSelectedPost] =
    useState(null);

  /*
  ====================================================
  MODAL MODE
  ====================================================

  Determina el comportamiento del modal.

  Posibles valores:

  "view"   -> Solo lectura
  "edit"   -> Editar publicación
  "create" -> Crear publicación
  */

  const [modalMode, setModalMode] =
    useState("view");

  /*
  ====================================================
  MODAL VISIBILITY
  ====================================================

  Controla si el modal está abierto.

  false -> oculto
  true  -> visible
  */

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  /*
  ====================================================
  VIEW POST
  ====================================================

  Abre una publicación en modo lectura.

  Flujo:

  1. Guarda el post seleccionado.
  2. Cambia el modo a "view".
  3. Abre el modal.
  */

  const handleViewPost = (post) => {
    setSelectedPost(post);
    setModalMode("view");
    setIsModalOpen(true);
  };

  /*
  ====================================================
  CREATE POST
  ====================================================

  Prepara una nueva publicación vacía.

  Se genera un objeto temporal para que
  el modal pueda trabajar sobre él.

  Date.now() se utiliza como ID temporal
  hasta implementar una base de datos.
  */

  const handleCreatePost = () => {

    setSelectedPost({
      id: Date.now(),
      title: "",
      description: "",
      image_url: "",
      verified: false,
    });

    setModalMode("create");
    setIsModalOpen(true);
  };

  /*
  ====================================================
  EDIT POST
  ====================================================

  Abre una publicación existente en modo edición.

  El modal recibe toda la información actual
  para permitir modificarla.
  */

  const handleEditPost = (post) => {
    setSelectedPost(post);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  /*
  ====================================================
  DELETE POST
  ====================================================

  Elimina una publicación.

  Antes de eliminar solicita confirmación
  para evitar borrados accidentales.
  */

  const handleDeletePost = (id) => {

    const confirmed =
      window.confirm(
        "Delete this post?"
      );

    if (!confirmed) return;

    setPosts((prevPosts) =>
      prevPosts.filter(
        (post) => post.id !== id
      )
    );

    /*
      Future:

      deletePost(id)
    */
  };

  /*
  ====================================================
  VERIFY POST
  ====================================================

  Alterna el estado de verificación.

  Si estaba verificado:
      true -> false

  Si no estaba verificado:
      false -> true
  */

  const handleVerifyPost = (id) => {

    setPosts((prevPosts) =>
      prevPosts.map((post) =>

        post.id === id
          ? {
              ...post,
              verified:
                !post.verified,
            }
          : post

      )
    );

    /*
      Future:

      updateVerifiedStatus(id)
    */
  };

  /*
  ====================================================
  SAVE POST
  ====================================================

  Recibe la información enviada desde
  PostModal.

  Dependiendo del modo actual:

  create -> crea nuevo registro
  edit   -> actualiza registro existente
  */

  const handleSavePost = (
    updatedPost
  ) => {

    /*
    ====================================
    CREATE MODE
    ====================================

    Inserta la nueva publicación al inicio
    de la lista.
    */

    if (modalMode === "create") {

      setPosts((prevPosts) => [
        updatedPost,
        ...prevPosts,
      ]);

    }

    /*
    ====================================
    EDIT MODE
    ====================================

    Reemplaza únicamente la publicación
    modificada.
    */

    if (modalMode === "edit") {

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === updatedPost.id
            ? updatedPost
            : post
        )
      );

    }

    setIsModalOpen(false);
  };

  return (
    <section className="posts-section">

      {/* ==========================================
          HEADER
          ========================================== */}

      <div className="posts-header">

        <h2>Posts</h2>

        {/* ==============================
            CREATE BUTTON
            ==============================

            Visible únicamente para
            administradores.
        */}

        {isAdmin && (

          <button
            type="button"
            className="create-post-btn"
            onClick={handleCreatePost}
          >
            + New Post
          </button>

        )}

      </div>

      {/* ==========================================
          POSTS GRID
          ========================================== */}

      {posts.length === 0 ? (

        /*
        ======================================
        EMPTY STATE
        ======================================

        Se muestra cuando no existen
        publicaciones.
        */

        <div className="empty-posts">

          <p>
            No posts available.
          </p>

        </div>

      ) : (

        /*
        ======================================
        POSTS LIST
        ======================================

        Genera una tarjeta por cada
        publicación existente.
        */

        <div className="posts-grid">

          {posts.map((post) => (

            <PostCard
              key={post.id}

              post={post}

              isAdmin={isAdmin}

              onView={
                handleViewPost
              }

              onEdit={
                handleEditPost
              }

              onDelete={
                handleDeletePost
              }

              onVerify={
                handleVerifyPost
              }
            />

          ))}

        </div>

      )}

      {/* ==========================================
          POST MODAL
          ==========================================

          Componente reutilizado para:

          - Ver publicaciones
          - Crear publicaciones
          - Editar publicaciones
      */}

      <PostModal
        isOpen={isModalOpen}
        onClose={() =>
          setIsModalOpen(false)
        }
        mode={modalMode}
        post={selectedPost}
        onSave={handleSavePost}
      />

    </section>
  );
};

export default PostsGrid;