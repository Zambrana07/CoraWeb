import express from "express";
import sql from "../db.js";

const router = express.Router();

async function getAuthenticatedAdmin(req, res) {
  const usuarioId = req.query?.usuarioId ?? req.body?.usuarioId ?? req.body?.id ?? null;

  if (!usuarioId) {
    res.status(401).json({ ok: false, message: "Se requiere usuario autenticado" });
    return null;
  }

  const [adminUser] = await sql`
    SELECT id, rol_id, nombre, correo
    FROM usuarios
    WHERE id::text = ${String(usuarioId)}
    LIMIT 1
  `;

  if (!adminUser) {
    res.status(401).json({ ok: false, message: "Usuario no encontrado" });
    return null;
  }

  if (Number(adminUser.rol_id) !== 2) {
    res.status(403).json({ ok: false, message: "Solo administradores pueden realizar esta acción" });
    return null;
  }

  return adminUser;
}

async function usuariosTableHasVerifiedColumn() {
  try {
    const result = await sql`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'usuarios'
        AND column_name = 'verificado'
      LIMIT 1
    `;

    return result.length > 0;
  } catch {
    return false;
  }
}

function normalizeAdminUser(user, fallbackVerified = true) {
  return {
    ...user,
    verificado: typeof user?.verificado === "boolean" ? user.verificado : fallbackVerified,
  };
}

router.get("/admin/verify", async (req, res) => {
  try {
    const adminUser = await getAuthenticatedAdmin(req, res);
    if (!adminUser) return;

    return res.json({
      ok: true,
      admin: true,
      user: {
        id: adminUser.id,
        rol_id: adminUser.rol_id,
        nombre: adminUser.nombre,
        correo: adminUser.correo,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.get("/admin/reportes", async (req, res) => {
  try {
    const adminUser = await getAuthenticatedAdmin(req, res);
    if (!adminUser) return;

    const reportesRaw = await sql`
      SELECT r.*, u.nombre AS reportado_por_nombre, reg.region_name
      FROM reportes r
      LEFT JOIN usuarios u ON u.id = r.reportado_por
      LEFT JOIN regiones reg ON reg.id = r.region_id
      ORDER BY r.fecha_creacion DESC
    `;

    return res.json({
      ok: true,
      reportes: reportesRaw.map((reporte) => ({
        ...reporte,
        reportado_por: reporte.reportado_por_nombre || reporte.reportado_por,
        imagenes: reporte.imagenes || [],
      })),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.put("/admin/reportes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, tipo_residuo, pendiente, cercania_agua, riesgo_contaminacion, clasificacion_material, region_name, latitud, longitud } = req.body;

    const adminUser = await getAuthenticatedAdmin(req, res);
    if (!adminUser) return;

    let regionId = null;
    if (region_name) {
      const region = await sql`
        SELECT id FROM regiones WHERE region_name = ${region_name} LIMIT 1
      `;

      if (region.length > 0) {
        regionId = region[0].id;
      } else {
        const insertedRegion = await sql`
          INSERT INTO regiones (region_name) VALUES (${region_name}) RETURNING id
        `;
        regionId = insertedRegion[0]?.id;
      }
    }

    const updated = await sql`
      UPDATE reportes
      SET
        cantidad = COALESCE(${cantidad}, cantidad),
        tipo_residuo = COALESCE(${tipo_residuo}, tipo_residuo),
        pendiente = COALESCE(${pendiente}, pendiente),
        cercania_agua = COALESCE(${cercania_agua}, cercania_agua),
        riesgo_contaminacion = COALESCE(${riesgo_contaminacion}, riesgo_contaminacion),
        clasificacion_material = COALESCE(${clasificacion_material}, clasificacion_material),
        region_id = COALESCE(${regionId}, region_id),
        latitud = COALESCE(${latitud}, latitud),
        longitud = COALESCE(${longitud}, longitud)
      WHERE id::text = ${String(id)}
      RETURNING *
    `;

    if (updated.length === 0) {
      return res.status(404).json({ ok: false, message: "Reporte no encontrado" });
    }

    return res.json({ ok: true, reporte: updated[0] });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.put("/admin/reportes/:id/verify", async (req, res) => {
  try {
    const { id } = req.params;
    const { verificado } = req.body;

    const adminUser = await getAuthenticatedAdmin(req, res);
    if (!adminUser) return;

    const updated = await sql`
      UPDATE reportes
      SET verificado = ${verificado}
      WHERE id::text = ${String(id)}
      RETURNING *
    `;

    if (updated.length === 0) {
      return res.status(404).json({ ok: false, message: "Reporte no encontrado" });
    }

    return res.json({ ok: true, reporte: updated[0] });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.delete("/admin/reportes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const adminUser = await getAuthenticatedAdmin(req, res);
    if (!adminUser) return;

    const deleted = await sql`
      DELETE FROM reportes WHERE id::text = ${String(id)} RETURNING *
    `;

    if (deleted.length === 0) {
      return res.status(404).json({ ok: false, message: "Reporte no encontrado" });
    }

    return res.json({ ok: true, reporte: deleted[0] });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.post("/admin/reportes/:id/images", async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    const adminUser = await getAuthenticatedAdmin(req, res);
    if (!adminUser) return;

    const existing = await sql`
      SELECT imagenes FROM reportes WHERE id = ${id} LIMIT 1
    `;

    if (existing.length === 0) {
      return res.status(404).json({ ok: false, message: "Reporte no encontrado" });
    }

    const images = existing[0].imagenes || [];
    if (images.length >= 3) {
      return res.status(400).json({ ok: false, message: "Solo se permiten hasta 3 imágenes" });
    }

    const updated = await sql`
      UPDATE reportes
      SET imagenes = ${[...images, imageUrl]}
      WHERE id::text = ${String(id)}
      RETURNING *
    `;

    return res.json({ ok: true, reporte: updated[0] });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.delete("/admin/reportes/:id/images/:index", async (req, res) => {
  try {
    const { id, index } = req.params;

    const adminUser = await getAuthenticatedAdmin(req, res);
    if (!adminUser) return;

    const existing = await sql`
      SELECT imagenes FROM reportes WHERE id = ${id} LIMIT 1
    `;

    if (existing.length === 0) {
      return res.status(404).json({ ok: false, message: "Reporte no encontrado" });
    }

    const images = (existing[0].imagenes || []).filter((_, i) => i !== Number(index));
    const updated = await sql`
      UPDATE reportes SET imagenes = ${images} WHERE id::text = ${String(id)} RETURNING *
    `;

    return res.json({ ok: true, reporte: updated[0] });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.get("/admin/usuarios", async (req, res) => {
  try {
    const adminUser = await getAuthenticatedAdmin(req, res);
    if (!adminUser) return;

    const hasVerifiedColumn = await usuariosTableHasVerifiedColumn();
    const usuariosRaw = hasVerifiedColumn
      ? await sql`
          SELECT id, nombre, correo, rol_id, verificado
          FROM usuarios
          ORDER BY nombre
        `
      : await sql`
          SELECT id, nombre, correo, rol_id
          FROM usuarios
          ORDER BY nombre
        `;

    const usuarios = usuariosRaw.map((usuario) => normalizeAdminUser(usuario, true));

    return res.json({ ok: true, usuarios });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.put("/admin/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { verificado, rol_id } = req.body;

    const adminUser = await getAuthenticatedAdmin(req, res);
    if (!adminUser) return;

    const hasVerifiedColumn = await usuariosTableHasVerifiedColumn();

    const updated = hasVerifiedColumn
      ? await sql`
          UPDATE usuarios
          SET
            verificado = COALESCE(${verificado}, verificado),
            rol_id = COALESCE(${rol_id}, rol_id)
          WHERE id::text = ${String(id)}
          RETURNING id, nombre, correo, rol_id, verificado
        `
      : await sql`
          UPDATE usuarios
          SET rol_id = COALESCE(${rol_id}, rol_id)
          WHERE id::text = ${String(id)}
          RETURNING id, nombre, correo, rol_id
        `;

    if (updated.length === 0) {
      return res.status(404).json({ ok: false, message: "Usuario no encontrado" });
    }

    const usuario = updated[0];
    return res.json({ ok: true, usuario: normalizeAdminUser(usuario, typeof verificado === "boolean" ? verificado : true) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.delete("/admin/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const adminUser = await getAuthenticatedAdmin(req, res);
    if (!adminUser) return;

    const existingUser = await sql`
      SELECT id
      FROM usuarios
      WHERE id::text = ${String(id)}
      LIMIT 1
    `;

    if (existingUser.length === 0) {
      return res.status(404).json({ ok: false, message: "Usuario no encontrado" });
    }

    const userReports = await sql`
      SELECT id
      FROM reportes
      WHERE reportado_por::text = ${String(id)}
    `;

    if (userReports.length > 0) {
      const reportIds = userReports.map((report) => String(report.id));
      await sql`
        DELETE FROM comentarios
        WHERE reporte_id::text = ANY(${reportIds})
      `;

      await sql`
        DELETE FROM reportes
        WHERE reportado_por::text = ${String(id)}
      `;
    }

    await sql`
      DELETE FROM comentarios
      WHERE usuario_id::text = ${String(id)}
    `;

    const deleted = await sql`
      DELETE FROM usuarios
      WHERE id::text = ${String(id)}
      RETURNING id
    `;

    if (deleted.length === 0) {
      return res.status(404).json({ ok: false, message: "Usuario no encontrado" });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando usuario:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;
