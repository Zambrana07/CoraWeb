/**
 * Login.jsx — puerta de entrada a CoraWeb.
 *
 * Paso a paso:
 *  1. Si ya hay un user en localStorage, salta al mapa (/).
 *  2. El campo se llama "Usuario" pero el API espera email.
 *  3. POST a /api/login. Si ok, guarda { id, rol } y navega a Home.
 *  4. Si falla, muestra el mensaje rojo bajo el título.
 */
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";
import logo from "../assets/img/CoraLogo.png";
import "../assets/styles/Login.css";


// ¿Hay un id guardado? Entonces ya está "logueado" (no hay tokens JWT).
function isAuthenticated() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.id != null;
  } catch (e) {
    return false;
  }
}

export default function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  // Copia el valor del input al estado usando el atributo name.
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const username = formData.username.trim();
    const password = formData.password;

    try 
    {
      fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: username, password }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok === true) {
            // Esta clave "user" es lo que Layout y el resto de páginas leen.
            localStorage.setItem(
              "user",
              JSON.stringify({
                id: data.id,
                rol: data.rol
              })
            );
            navigate("/");
          } else {
            setError("Credenciales incorrectas. Intentalo de nuevo.");
          }
          setLoading(false);
        });
    } catch (err) {
      console.error("Error en login:", err);
      setError("Error al conectar con el servidor. Intenta nuevamente.");
      setLoading(false);
    }
    };
    
  return (
    <div className="login-page page-transition">

      <main className="login-main">
        <div className="login-card">
          <div className="login-card-header">
            <img src={logo} alt="Cora Web" className="login-logo" />
            <h1 className="login-title nature-title">Bienvenido</h1>
            <p className="login-subtitle">
              Inicia sesion para explorar Cora Web
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && <p className="login-error">{error}</p>}

            <div className="login-input-group">
              <label>Usuario</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Tu usuario"
              />
            </div>

            <div className="login-input-group">
              <label>Contraseña</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Tu contraseña"
              />
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </main>

      <footer className="login-footer">
        <p>
          &copy; {new Date().getFullYear()} Cora Web
        </p>
      </footer>
    </div>
  );
}
