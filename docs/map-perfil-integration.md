# Mapa → Perfil + rediseño mockup

**Fecha:** 2026-06-04

## Sincronización Firebase

- Colección `reportes` (misma que `myMapComponent`).
- Campos en perfil: `name`, `region`, `wasteType`, `amount`, `riskLevel`, `timestamp`, `verified`.
- Admin: editar / verificar / desverificar / eliminar persistido en Firestore (`verificado`, `updateDoc`, `deleteDoc`).

## Archivos

| Archivo | Rol |
|---------|-----|
| `src/lib/reportesMapper.js` | Mapeo Firestore ↔ post |
| `src/services/reportesService.js` | CRUD admin |
| `src/hooks/useFirebaseReportes.js` | `onSnapshot` + acciones |

## Layout (mockup)

1. Banner gris con avatar centrado y stats abajo-derecha.
2. Nombre subrayado bajo el banner.
3. Sección «Sobre Mí» plana.
4. Grid «Publicados» responsive (`auto-fill`, ancho completo).
5. Layout ancho completo: sin `max-width` móvil; banner y contenido escalan con `clamp` / `vw`.

## Admin

- Login sin cambios (`admin123`).
- Hover en tile: Editar / Verificar / Borrar.
- Reportes del mapa: modal con campos de residuo; posts locales: título/imagen/descripción.
