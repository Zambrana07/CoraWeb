import express from "express";
import cors from "cors";
import "dotenv/config";
import sql from "./db.js";
import { createClient } from "pexels";

const app = express();
const pexels = createClient(process.env.PEXELS_KEY);

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// =====================================================
// CACHE DIARIO PEXELS (1 request por día)
// =====================================================

let dailyImage = null;
let dailyDate = null;

async function getDailyImage() {
  const today = new Date().toISOString().split("T")[0];

  // Si ya tenemos imagen del día, la reutilizamos
  if (dailyImage && dailyDate === today) {
    return dailyImage;
  }

  const page = Math.floor(Math.random() * 100) + 1;

  const result = await pexels.photos.search({
    query: "nature",
    orientation: "landscape",
    per_page: 1,
    page,
  });

  if (!result.photos?.length) {
    throw new Error("No se encontraron imágenes en Pexels");
  }

  dailyImage = result.photos[0].src.large2x;
  dailyDate = today;

    return dailyImage;
}

// =====================================================
// ENDPOINT IMAGEN DIARIA
// =====================================================

app.get("/api/nature-image", async (req, res) => {
  try {
    const image = await getDailyImage();

    return res.status(200).json({
      ok: true,
      image,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo imagen",
    });
  }
});

// =====================================================
// PERFIL USUARIO
// =====================================================

app.post("/api/load-perfil", async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        ok: false,
        message: "ID de usuario requerido",
      });
    }

    const usuario = await sql`
      SELECT *
      FROM usuarios
      WHERE id = ${id}
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
      perfil: usuario[0],
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
    });
  }
});

// =====================================================
// ACTUALIZAR PERFIL (nombre, aboutme, perfil_img)
// =====================================================

app.put("/api/perfil", async (req, res) => {
  try {
    const { id, nombre, aboutme, perfil_img } = req.body;

    if (!id) {
      return res.status(400).json({ ok: false, message: "ID de usuario requerido" });
    }

    const updated = await sql`
      UPDATE usuarios
      SET
        nombre = COALESCE(${nombre}, nombre),
        aboutme = COALESCE(${aboutme}, aboutme),
        perfil_img = COALESCE(${perfil_img}, perfil_img)
      WHERE id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return res.status(404).json({ ok: false, message: "Usuario no encontrado" });
    }

    return res.status(200).json({ ok: true, perfil: updated[0] });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Error interno del servidor" });
  }
});

// =====================================================
// AGREGAR PUNTO
// =====================================================

app.post("/api/agregar-punto", async (req, res) => {
  try {
    const { id, puntoId } = req.body;

    if (!id || !puntoId) {
      return res.status(400).json({
        ok: false,
        message: "id y puntoId son requeridos",
      });
    }

    const usuario = await sql`
      UPDATE usuarios
      SET puntos_registrados = puntos_registrados || ARRAY[${puntoId}]
      WHERE id = ${id}
      RETURNING *
    `;

    if (usuario.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado",
      });
    }

    return res.status(200).json({
      ok: true,
      perfil: usuario[0],
      message: "Punto agregado correctamente",
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
    });
  }
});

app.post("/api/login", async (req, res) => {
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
      rol: usuario[0].rol_id
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
    });
  }
});



app.get("/api/reportes", async (req, res) => {
  try {
    const { usuarioId, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(10, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    const reportesRaw = await sql`
      SELECT
        r.id,
        r.cantidad,
        r.cercania_agua,
        r.clasificacion_material,
        r.fecha_creacion,
        r.latitud,
        r.longitud,
        r.pendiente,
        r.region_id,
        r.reportado_por,
        r.riesgo_contaminacion,
        r.tipo_residuo,
        r.imagenes,
        r.verificado,
        u.nombre AS reportado_por_nombre,
        reg.region_name
      FROM reportes r
      INNER JOIN usuarios u
        ON u.id = r.reportado_por
      LEFT JOIN regiones reg
        ON reg.id = r.region_id
      ${usuarioId ? sql`WHERE r.reportado_por = ${usuarioId}` : sql``}
      ORDER BY r.fecha_creacion DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM reportes r
      ${usuarioId ? sql`WHERE r.reportado_por = ${usuarioId}` : sql``}
    `;
    const total = countResult[0]?.total || 0;

    const reportes = reportesRaw.map((reporte) => ({
      id: reporte.id,
      cantidad: reporte.cantidad,
      cercania_agua: reporte.cercania_agua,
      clasificacion_material: reporte.clasificacion_material,
      fecha_creacion: reporte.fecha_creacion ? new Date(reporte.fecha_creacion).toISOString() : null,
      latitud: reporte.latitud,
      longitud: reporte.longitud,
      pendiente: reporte.pendiente,
      region_id: reporte.region_id != null ? reporte.region_id.toString() : null,
      reportado_por: reporte.reportado_por_nombre || reporte.reportado_por,
      riesgo_contaminacion: reporte.riesgo_contaminacion,
      tipo_residuo: reporte.tipo_residuo,
      imagenes: reporte.imagenes || [],
      verificado: reporte.verificado,
      region_name: reporte.region_name,
    }));

    const totalPages = Math.ceil(total / limitNum);
    return res.json({
      ok: true,
      reportes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages,
        hasMore: pageNum < totalPages,
      },
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});
app.post("/api/reportes", async (req, res) => {
  try {
    const {
      usuarioId,
      regionName,
      wasteType,
      amount,
      slope,
      waterProximity,
      riskLevel,
      materialType,
      latitud,
      longitud,
      imagenes = [],
    } = req.body;

    if (!usuarioId || !amount || latitud == null || longitud == null) {
      return res.status(400).json({
        ok: false,
        message: "usuarioId, amount, latitud y longitud son requeridos",
      });
    }

    if (!Array.isArray(imagenes)) {
      return res.status(400).json({ ok: false, message: "imagenes debe ser un arreglo" });
    }

    if (imagenes.length > 3) {
      return res.status(400).json({ ok: false, message: "Solo se permiten hasta 3 imágenes." });
    }

    let regionId = null;
    if (regionName) {
      const region = await sql`
        SELECT id
        FROM regiones
        WHERE region_name = ${regionName}
        LIMIT 1
      `;

      if (region.length > 0) {
        regionId = region[0].id;
      } else {
        const insertedRegion = await sql`
          INSERT INTO regiones (region_name)
          VALUES (${regionName})
          RETURNING id
        `;
        regionId = insertedRegion[0]?.id;
      }
    }

    const nuevoReporte = await sql`
      INSERT INTO reportes (
        cantidad,
        cercania_agua,
        clasificacion_material,
        latitud,
        longitud,
        pendiente,
        region_id,
        reportado_por,
        riesgo_contaminacion,
        tipo_residuo,
        imagenes
      ) VALUES (
        ${amount},
        ${waterProximity},
        ${materialType},
        ${latitud},
        ${longitud},
        ${slope},
        ${regionId},
        ${usuarioId},
        ${riskLevel},
        ${wasteType},
        ${imagenes}
      )
      RETURNING *
    `;

    return res.status(201).json({
      ok: true,
      reporte: nuevoReporte[0],
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
    });
  }
});

app.delete("/api/reportes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { usuarioId } = req.body;

    if (!id || !usuarioId) {
      return res.status(400).json({
        ok: false,
        message: "id y usuarioId son requeridos",
      });
    }

    const deleted = await sql`
      DELETE FROM reportes
      WHERE id = ${id} AND reportado_por = ${usuarioId}
      RETURNING *
    `;

    if (deleted.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Reporte no encontrado o no autorizado",
      });
    }

    return res.status(200).json({
      ok: true,
      reporte: deleted[0],
    });
  } catch (error) {
    console.error("Error eliminando reporte:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
    });
  }
});
app.get("/api/regiones", async (req, res) => {

  const regiones = await sql`
    SELECT *
    FROM regiones
    ORDER BY region_name
  `;

  res.json({
    ok: true,
    regiones
  });

});
// =====================================================
// COMENTARIOS
// =====================================================

app.get('/api/reportes/:id/comentarios', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ ok: false, message: 'reporte id requerido' });
    }

    const comentarios = await sql`
      SELECT c.id, c.reporte_id, c.usuario_id, c.comentario, c.fecha_creacion, u.nombre AS usuario_nombre
      FROM comentarios c
      LEFT JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.reporte_id = ${id}
      ORDER BY c.fecha_creacion DESC
    `;

    return res.status(200).json({ ok: true, comentarios });
  } catch (error) {
    console.error('GET comentarios error:', error);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
});

app.post('/api/reportes/:id/comentarios', async (req, res) => {
  try {
    const { id } = req.params; // reporte id
    const { usuarioId, comentario } = req.body;

    if (!id || !usuarioId || !comentario) {
      return res.status(400).json({ ok: false, message: 'reporte id, usuarioId y comentario son requeridos' });
    }

    // validar que el usuario exista para evitar violaciones de FK
    const usuarioExist = await sql`
      SELECT id, nombre FROM usuarios WHERE id = ${usuarioId} LIMIT 1
    `;
    if (usuarioExist.length === 0) {
      return res.status(400).json({ ok: false, message: 'Usuario no encontrado. Verifica usuarioId.' });
    }

    const inserted = await sql`
      INSERT INTO comentarios (reporte_id, usuario_id, comentario)
      VALUES (${id}, ${usuarioId}, ${comentario})
      RETURNING *
    `;

    const usuario = await sql`
      SELECT nombre FROM usuarios WHERE id = ${usuarioId} LIMIT 1
    `;

    const nuevo = inserted[0];
    const usuario_nombre = usuario[0]?.nombre || 'Anonimo';

    const responseObj = {
      id: nuevo.id,
      reporte_id: nuevo.reporte_id,
      usuario_id: nuevo.usuario_id,
      comentario: nuevo.comentario,
      fecha_creacion: nuevo.fecha_creacion,
      usuario_nombre,
    };

    return res.status(201).json({ ok: true, comentario: responseObj });
  } catch (error) {
    console.error('POST comentarios error:', error);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
});
// =====================================================
// SERVER
// =====================================================





const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
});