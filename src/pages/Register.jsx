import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import logo from "../assets/img/CoraLogo.png";
import "../assets/styles/Login.css";
import { getStoredUser, setStoredUser } from "../lib/authSession";

function isAuthenticated() {
  const user = getStoredUser();
  return user?.id != null;
}

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const username = formData.username.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (!username || !email || !password || !confirmPassword) {
      setError("Completa todos los campos para crear la cuenta.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Ingresa un correo válido.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (data.ok === true) {
        setStoredUser({
          id: data.id,
          rol: data.rol,
        });
        navigate("/");
        return;
      }

      setError(data.message || "No se pudo crear la cuenta. Intenta nuevamente.");
    } catch (err) {
      console.error("Error en registro:", err);
      setError("Error al conectar con el servidor. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page page-transition">
      <main className="login-main">
        <div className="login-card">
          <div className="login-card-header">
            <img src={logo} alt="Cora Web" className="login-logo" />
            <h1 className="login-title nature-title">Crear cuenta</h1>
            <p className="login-subtitle">
              Regístrate para explorar Cora Web
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
              <label>Correo</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="tucorreo@dominio.com"
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

            <div className="login-input-group">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Repite tu contraseña"
              />
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>
        </div>
        <a className="create-account" href="/login">¿Ya tienes cuenta?</a>
      </main>

      <footer className="login-footer">
        <p>&copy; {new Date().getFullYear()} Cora Web</p>
      </footer>
    </div>
  );
}