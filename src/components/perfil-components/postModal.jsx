/*
====================================================
POST MODAL COMPONENT
====================================================

Responsabilidad:

Mostrar una publicación dentro de una
ventana modal.

Puede funcionar en dos modos:

1. View Mode
   - Solo visualización.
   - Muestra información del post.

2. Edit/Create Mode
   - Permite modificar información.
   - Permite seleccionar imagen.
   - Permite guardar cambios.

El comportamiento depende de la prop "mode".

Este enfoque evita crear múltiples componentes
para tareas similares.
*/

import { useEffect, useState } from "react";

const PostModal = ({
  isOpen,
  onClose,
  mode,
  post,
  onSave,
}) => {

  /*
  ====================================================
  FORM STATES
  ====================================================

  Mantienen los valores temporales del formulario.

  Se utilizan para permitir edición sin modificar
  directamente los datos originales del post.
  */

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  /*
  ====================================================
  IMAGE PREVIEW STATE
  ====================================================

  Almacena la imagen que se mostrará
  dentro del modal.

  Puede provenir de:

  - Una publicación existente.
  - Una nueva imagen seleccionada.
  */

  const [imagePreview, setImagePreview] =
    useState("");

  /*
  ====================================================
  SELECTED FILE STATE
  ====================================================

  Guarda el archivo original seleccionado
  por el usuario.

  Actualmente se conserva para futuras
  integraciones con Supabase Storage.
  */

  const [selectedFile, setSelectedFile] =
    useState(null);

  /*
  ====================================================
  POST SYNCHRONIZATION
  ====================================================

  Cada vez que cambia el post recibido
  desde el componente padre:

  - Actualiza título
  - Actualiza descripción
  - Actualiza imagen

  Esto permite reutilizar el mismo modal
  para diferentes publicaciones.
  */

  useEffect(() => {

    if (!post) return;

    setTitle(post.title || "");
    setDescription(
      post.description || ""
    );

    setImagePreview(
      post.image_url || ""
    );

    setSelectedFile(null);

  }, [post]);

  /*
  ====================================================
  MODAL VISIBILITY
  ====================================================

  Si el modal no está abierto,
  no se renderiza nada.

  Esto evita renders innecesarios
  y reduce consumo de recursos.
  */

  if (!isOpen) return null;

  /*
  ====================================================
  IMAGE SELECT HANDLER
  ====================================================

  Se ejecuta cuando el usuario
  selecciona una imagen.

  Funciones:

  1. Guarda el archivo.
  2. Genera una vista previa.
  3. Actualiza la imagen mostrada.
  */

  const handleImageSelect = (
    event
  ) => {

    const file =
      event.target.files[0];

    if (!file) return;

    setSelectedFile(file);

    const preview =
      URL.createObjectURL(file);

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview(preview);
  };

  /*
  ====================================================
  SAVE HANDLER
  ====================================================

  Construye un objeto actualizado
  con toda la información del post.

  Luego envía los datos al componente padre
  mediante la función onSave.

  El componente padre será responsable de:

  - Actualizar estado.
  - Guardar en base de datos.
  - Subir imágenes.
  */

  const handleSubmit = () => {
    if (!post) return;

    const postData = {
      ...post,
      title: title.trim(),
      description: description.trim(),
      image_url: imagePreview,
      imageFile: selectedFile,
    };

    onSave(postData);
  };

  /*
  ====================================================
  VIEW MODE CHECK
  ====================================================

  Determina qué interfaz mostrar.

  true  -> Vista pública
  false -> Editor
  */

  const isViewMode =
    mode === "view";

  return (

    <div className="modal-overlay">

      <div className="post-modal">

        {/* ======================================
            CLOSE BUTTON
            ======================================

            Cierra el modal sin guardar.
        */}

        <button
          type="button"
          className="close-modal-btn"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>

        {/* ======================================
            IMAGE SECTION
            ======================================

            Muestra la imagen actual.

            Si no existe imagen,
            muestra un placeholder.
        */}

        <div className="modal-image-container">

          {imagePreview ? (

            <img
              src={imagePreview}
              alt={title}
              className="modal-image"
            />

          ) : (

            <div className="image-placeholder">
              Sin seleccionar
            </div>

          )}

        </div>

        {/* ======================================
            CONTENT SECTION
            ====================================== */}

        <div className="modal-content">

          {isViewMode ? (

            /*
            ======================================
            VIEW MODE
            ======================================

            Solo muestra información.
            No permite edición.
            */

            <>
              <h2>{title}</h2>

              <p>{description}</p>

              {post?.verified && (
                <span className="verified-badge">
                  ✓ Verificado
                </span>
              )}
            </>

          ) : (

            /*
            ======================================
            EDIT MODE
            ======================================

            Permite modificar contenido.
            */

            <>

              <input
                type="text"
                placeholder="Post Title"
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
                maxLength={100}
              />

              <textarea
                placeholder="Post Description"
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                maxLength={1000}
              />

              <input
                type="file"
                accept="image/*"
                onChange={
                  handleImageSelect
                }
              />

              {/* ==========================
                  ACTION BUTTONS
                  ========================== */}

              <div className="modal-actions">

                <button
                  type="button"
                  className="save-btn"
                  onClick={handleSubmit}
                >
                  Guardar
                </button>

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={onClose}
                >
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