/*
====================================================
ABOUT ME COMPONENT
====================================================

Responsabilidad:

Mostrar y permitir editar la sección
"About Me" del perfil de usuario.

Este componente NO almacena permanentemente la
información del perfil.

En lugar de eso:

- Recibe la información desde el componente padre.
- Mantiene una copia temporal mientras el usuario
  está editando.
- Envía los cambios al componente padre únicamente
  cuando el usuario presiona "Save".

Esto evita modificar los datos reales hasta que
el usuario confirme los cambios.
*/

import { useEffect, useState } from "react";

const Abtme = ({
  perfil,
  setPerfil,
  isAdmin,
}) => {

  /*
  ====================================================
  EDITING STATE
  ====================================================

  Controla si el usuario está actualmente
  editando el texto.

  false -> modo lectura
  true  -> modo edición

  Se utiliza para alternar entre mostrar
  el texto normal o el editor.
  */

  const [editing, setEditing] = useState(false);

  /*
  ====================================================
  TEMPORARY TEXT STATE
  ====================================================

  Guarda una copia temporal del contenido.

  ¿Por qué no editar directamente profile.abtme?

  Porque el usuario podría cancelar los cambios.

  Mantener una copia local permite:
  - Editar libremente.
  - Guardar únicamente cuando se confirme.
  - Restaurar el contenido original si se cancela.
  */

  const [abtText, setAbtText] = useState(
    perfil.aboutMe
  );

  useEffect(() => {
    if (!editing) {
      setAbtText(perfil.aboutMe);
    }
  }, [perfil.aboutMe, editing]);

  /*
  ====================================================
  SAVE CHANGES
  ====================================================

  Ejecutado cuando el usuario presiona Save.

  Funciones:

  1. Actualiza el perfil en el componente padre.
  2. Conserva las demás propiedades del perfil.
  3. Cierra el modo edición.

  Se utiliza el operador spread (...)

  para copiar el estado anterior y evitar
  sobrescribir propiedades que no se están editando.
  */

  const handleSave = () => {
    setPerfil((prev) => ({
      ...prev,
      aboutMe: abtText,
    }));

    setEditing(false);

    /*
      Future Supabase integration:

      updateProfile({
        abt_me: abtText
      });

      Aquí se enviarán los cambios
      a la base de datos.
    */
  };

  /*
  ====================================================
  CANCEL CHANGES
  ====================================================

  Ejecutado cuando el usuario presiona Cancel.

  Funciones:

  1. Descarta todos los cambios temporales.
  2. Restaura el texto original.
  3. Sale del modo edición.

  Esto garantiza que los datos reales
  del perfil nunca sean modificados
  accidentalmente.
  */

  const handleCancel = () => {
    setAbtText(perfil.aboutMe);
    setEditing(false);
  };

  return (
    <section className="about-section">

      {/* ==========================================
          SECTION HEADER
          ==========================================

          Título de la sección.

          El botón Edit solamente aparece cuando:

          - El usuario es administrador.
          - No se encuentra editando actualmente.

          Esto evita múltiples sesiones de edición
          simultáneas.
      */}

      <div className="section-header">
        <h2>Sobre Mi</h2>

        {isAdmin && !editing && (
          <button
            type="button"
            className="edit-btn"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        )}
      </div>

      {/* ==========================================
          VIEW MODE
          ==========================================

          Cuando editing es false:

          Se muestra únicamente el texto
          almacenado en el perfil.
      */}

      {!editing ? (
        <p className="about-text">
          {perfil.aboutMe}
        </p>
      ) : (

        /*
        ==========================================
        EDIT MODE
        ==========================================

        Cuando editing es true:

        Se muestra un editor que permite
        modificar temporalmente el texto.
        */

        <div className="about-editor">

          <textarea
            value={abtText}

            onChange={(e) =>
              setAbtText(e.target.value)
            }

            /*
            Limita la longitud máxima.

            Beneficios:

            - Evita textos excesivamente largos.
            - Mantiene consistencia visual.
            - Facilita almacenamiento futuro.
            */
            maxLength={500}

            placeholder="Hola! Estoy usando Cora, patrocinado por Aemonia."
          />

          {/* ======================================
              ACTION BUTTONS
              ======================================

              Save:
              Guarda los cambios.

              Cancel:
              Descarta los cambios.
          */}

          <div className="editor-actions">

            <button
              type="button"
              className="save-btn"
              onClick={handleSave}
            >
              Save
            </button>

            <button
              type="button"
              className="cancel-btn"
              onClick={handleCancel}
            >
              Cancel
            </button>

          </div>

          {/* ======================================
              CHARACTER COUNTER
              ======================================

              Muestra al usuario cuántos caracteres
              ha utilizado.

              Esto mejora la experiencia porque
              permite conocer cuánto espacio queda
              disponible antes de alcanzar el límite.
          */}

          <p className="character-counter">
            {abtText.length}/500
          </p>

        </div>
      )}

    </section>
  );
};

export default Abtme;