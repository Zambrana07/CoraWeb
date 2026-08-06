import express from "express";
import sql from "../db.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, usuarioId, createdByAdmin, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        ok: false,
        message: "Usuario, correo y contraseña requeridos",
      });
    }

    if (createdByAdmin) {
      const adminUser = await sql`
        SELECT id
        FROM usuarios
        WHERE id = ${usuarioId} AND rol_id = 2
        LIMIT 1
      `;

      if (adminUser.length === 0) {
        return res.status(403).json({ ok: false, message: "Solo administradores pueden crear usuarios" });
      }
    }

    const existingUser = await sql`
      SELECT id
      FROM usuarios
      WHERE correo = ${email}
      LIMIT 1
    `;

    if (existingUser.length > 0) {
      return res.status(409).json({
        ok: false,
        message: "Ya existe una cuenta con ese correo",
      });
    }

    const existingName = await sql`
      SELECT id
      FROM usuarios
      WHERE nombre = ${username}
      LIMIT 1
    `;

    if (existingName.length > 0) {
      return res.status(409).json({
        ok: false,
        message: "Ese nombre de usuario ya está en uso",
      });
    }

    const roleId = createdByAdmin ? (role === 2 ? 2 : 1) : 1;

    const inserted = await sql`
      INSERT INTO usuarios (nombre, correo, password, rol_id, aboutme, perfil_img)
      VALUES (${username}, ${email}, ${password}, ${roleId}, '', NULL)
      RETURNING id, rol_id
    `;

    return res.status(201).json({
      ok: true,
      id: inserted[0].id,
      rol: Number(inserted[0].rol_id),
    });
  } catch (err) {
    console.error("Error creando usuario:", err);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: "Email y contraseña requeridos",
      });
    }

    const usuario = await sql`
      SELECT id, rol_id
      FROM usuarios
      WHERE correo = ${email} AND password = ${password}
      LIMIT 1
    `;

    if (usuario.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado",
      });
    }

    return res.status(200).json({
      ok: true,
      id: usuario[0].id,
      rol: Number(usuario[0].rol_id),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
    });
  }
});

export default router;
