/*
====================================================
PROFILE STATS COMPONENT
====================================================

Responsabilidad:

Mostrar la información principal del perfil.

Incluye:

- Foto de perfil
- Nombre del usuario
- Herramientas de edición para administradores

Este componente recibe la información desde
el componente padre y solamente modifica
los datos cuando el administrador confirma
los cambios.

La lógica sigue el patrón de:

Visualizar → Editar → Guardar

para evitar modificaciones accidentales.
*/

import { useEffect, useRef, useState } from "react";

const PfStats = ({
  perfil,
  isAdmin,
  setPerfil,
}) => {

  /*
  ====================================================
  NAME EDITING STATE
  ====================================================

  Controla si el nombre se encuentra en
  modo visualización o modo edición.

  false -> Mostrar nombre normal
  true  -> Mostrar editor
  */

  const [editingName, setEditingName] =
    useState(false);

  /*
  ====================================================
  TEMPORARY NAME STATE
  ====================================================

  Mantiene una copia temporal del nombre.

  Esto permite:

  - Escribir cambios libremente
  - Guardar únicamente al confirmar
  - Cancelar cambios fácilmente

  Sin modificar inmediatamente el perfil real.
  */

  const [newName, setNewName] =
    useState(perfil.name);

  /*
  ====================================================
  FILE INPUT REFERENCE
  ====================================================

  Referencia al input de archivos.

  Permite abrir el selector de imágenes
  desde un botón personalizado.

  Sin esta referencia el usuario tendría
  que interactuar directamente con el
  input file nativo del navegador.
  */

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!editingName) {
      setNewName(perfil.name);
    }
  }, [perfil.name, editingName]);

  /*
  ====================================================
  SAVE NAME
  ====================================================

  Guarda el nuevo nombre dentro del perfil.

  Utiliza el operador spread (...)

  para conservar el resto de propiedades
  existentes dentro del objeto perfil.
  */

  const handleNameSave = () => {

    setPerfil((prev) => ({
      ...prev,
      name: newName,
    }));

    setEditingName(false);

    /*
      Future integration:

      updateProfileName(newName)
    */
  };

  /*
  ====================================================
  CHANGE PROFILE IMAGE
  ====================================================

  Se ejecuta cuando el usuario selecciona
  una nueva imagen.

  Flujo:

  1. Obtiene el archivo.
  2. Verifica que exista.
  3. Genera una URL temporal.
  4. Actualiza la imagen del perfil.

  Actualmente la imagen se almacena
  únicamente en memoria.

  Más adelante se subirá al servidor.
  */

  const handleImageChange = (event) => {

    const file = event.target.files[0];

    if (!file) return;

    /*
      URL.createObjectURL()

      Genera una URL temporal para mostrar
      la imagen inmediatamente sin necesidad
      de subirla primero.
    */

    const imageUrl =
      URL.createObjectURL(file);

    if (perfil.profileImage?.startsWith("blob:")) {
      URL.revokeObjectURL(perfil.profileImage);
    }

    setPerfil((prev) => ({
      ...prev,
      profileImage: imageUrl,
    }));

    /*
      Future integration:

      uploadProfileImage(file)
    */
  };

  return (
    <section className="profile-header">

      {/* ==========================================
          PROFILE IMAGE SECTION
          ==========================================

          Muestra la imagen actual del perfil.

          Si el usuario es administrador
          también permite cambiarla.
      */}

      <div className="profile-image-container">

        <img
          src={perfil.profileImage}
          alt={perfil.name}
          className="profile-image"
        />

        {/* ======================================
            ADMIN IMAGE CONTROLS
            ======================================

            Solamente visibles para administradores.
        */}

        {isAdmin && (
          <>

            <button
              type="button"
              className="change-image-btn"
              onClick={() =>
                fileInputRef.current?.click()
              }
            >
              Cambiar foto de perfil
            </button>

            {/* ==============================
                HIDDEN FILE INPUT
                ==============================

                Input oculto utilizado para
                abrir el explorador de archivos.

                Se activa mediante la referencia.
            */}

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

      {/* ==========================================
          PROFILE NAME SECTION
          ==========================================

          Permite visualizar o editar
          el nombre del usuario.
      */}

      <div className="profile-name-section">

        {!editingName ? (

          <>
            <h1>{perfil.name}</h1>

            {isAdmin && (
              <button
                type="button"
                className="edit-btn"
                onClick={() =>
                  setEditingName(true)
                }
              >
                Editar
              </button>
            )}
          </>

        ) : (

          /*
          ==========================================
          NAME EDITOR
          ==========================================

          Aparece cuando editingName es true.

          Permite modificar temporalmente
          el nombre antes de guardarlo.
          */

          <div className="edit-name-container">

            <input
              type="text"
              value={newName}
              onChange={(e) =>
                setNewName(e.target.value)
              }
              maxLength={50}
            />

            <button
              type="button"
              className="save-btn"
              onClick={handleNameSave}
            >
              Guardar
            </button>

            <button
              type="button"
              className="cancel-btn"
              onClick={() => {

                /*
                  Restaurar nombre original
                  y salir del editor.
                */

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