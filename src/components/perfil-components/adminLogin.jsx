/*
====================================================
ADMIN LOGIN COMPONENT
====================================================

Responsabilidad:

Gestionar el acceso al modo administrador.

Actualmente utiliza una contraseña local
almacenada dentro del código.

Cuando el usuario introduce la contraseña
correcta:

- Activa el modo administrador.
- Permite acceder a funciones de edición.
- Cierra automáticamente la ventana modal.

IMPORTANTE:

Esta implementación es temporal y NO es segura
para producción.

En futuras versiones deberá reemplazarse por:

- Supabase Auth
- JWT
- OAuth
- Sistema de usuarios real
*/

import { useState } from "react";

/*
====================================================
TEMPORARY ADMIN PASSWORD
====================================================

Contraseña utilizada durante el desarrollo.

Se almacena localmente únicamente para pruebas.

Nunca debería existir una contraseña hardcodeada
en una aplicación real porque cualquiera podría
verla inspeccionando el código.
*/

const ADMIN_PASSWORD = "admin123";

const AdminLogin = ({
  isAdmin,
  setIsAdmin,
}) => {

  /*
  ====================================================
  MODAL VISIBILITY STATE
  ====================================================

  Controla si la ventana emergente (modal)
  está visible.

  false -> modal cerrado
  true  -> modal abierto
  */

  const [showModal, setShowModal] =
    useState(false);

  /*
  ====================================================
  PASSWORD INPUT STATE
  ====================================================

  Guarda temporalmente el texto escrito
  por el usuario en el campo de contraseña.

  Se mantiene separado del estado global
  porque únicamente es relevante para
  este componente.
  */

  const [password, setPassword] =
    useState("");

  /*
  ====================================================
  ERROR MESSAGE STATE
  ====================================================

  Almacena mensajes de error cuando el
  usuario introduce una contraseña inválida.

  Ejemplo:

  "Incorrect password."
  */

  const [error, setError] =
    useState("");

  /*
  ====================================================
  LOGIN HANDLER
  ====================================================

  Se ejecuta cuando el usuario presiona Login.

  Flujo:

  1. Verifica la contraseña.
  2. Si es correcta:
      - Activa modo administrador.
      - Limpia campos.
      - Cierra el modal.
  3. Si es incorrecta:
      - Muestra mensaje de error.
  */

  const handleLogin = () => {

    if (password === ADMIN_PASSWORD) {

      setIsAdmin(true);

      // Limpieza de datos temporales
      setPassword("");
      setError("");
      setShowModal(false);

      return;
    }

    setError("Incorrect password.");
  };

  /*
  ====================================================
  LOGOUT HANDLER
  ====================================================

  Desactiva el modo administrador.

  El usuario vuelve inmediatamente
  al modo visitante.
  */

  const handleLogout = () => {
    setIsAdmin(false);
  };

  return (
    <>
      {/* ==========================================
          ADMIN CONTROLS
          ==========================================

          Muestra un botón diferente según
          el estado actual del usuario.

          Visitante:
          -> Admin Login

          Administrador:
          -> Logout
      */}

      <section className="admin-controls">

        {!isAdmin ? (

          <button
            type="button"
            className="admin-login-btn"
            onClick={() =>
              setShowModal(true)
            }
          >
            Admin Login
          </button>

        ) : (

          <button
            type="button"
            className="admin-logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>

        )}

      </section>

      {/* ==========================================
          LOGIN MODAL
          ==========================================

          Se muestra únicamente cuando
          showModal es true.

          Utiliza renderizado condicional
          para evitar cargar el componente
          cuando no se necesita.
      */}

      {showModal && (

        <div className="modal-overlay">

          <div className="admin-modal">

            <h2>Admin Login</h2>

            {/* ==============================
                PASSWORD INPUT
                ==============================

                Campo controlado por React.

                Cada cambio actualiza el estado
                password.
            */}

            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLogin();
                }
              }}
            />

            {/* ==============================
                ERROR DISPLAY
                ==============================

                Solo aparece cuando existe
                un mensaje de error.
            */}

            {error && (

              <p className="error-message">
                {error}
              </p>

            )}

            {/* ==============================
                ACTION BUTTONS
                ==============================

                Login:
                Intenta autenticar.

                Cancel:
                Cierra el modal y limpia
                todos los datos temporales.
            */}

            <div className="modal-buttons">

              <button
                type="button"
                className="save-btn"
                onClick={handleLogin}
              >
                Login
              </button>

              <button
                type="button"
                className="cancel-btn"
                onClick={() => {

                  setShowModal(false);

                  // Limpieza de estados
                  setPassword("");
                  setError("");

                }}
              >
                Cancelar
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
};

export default AdminLogin;