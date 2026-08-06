# 🚨 AUDITORÍA DE RENDIMIENTO - CoraWeb

## Resumen Ejecutivo
El proyecto tiene **8 problemas críticos** que ralentizan significativamente la aplicación. Estimación de mejora: **60-70% más rápido** después de todas las optimizaciones.

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. **REDUNDANCIA DE DEPENDENCIAS: Firebase + Supabase**
**Ubicación:** `package.json`  
**Problema:**
```json
"firebase": "^12.13.0"  // ❌ NO SE USA
"@supabase/supabase-js": "^2.108.2"  // ✅ Se usa para realtime
```
- Firebase se importa pero **nunca se utiliza**
- Supabase hace todo lo que necesitas
- **Tamaño innecesario:** ~100KB en bundle

**Solución:**
```bash
npm uninstall firebase
```

---

### 2. **COMPONENTE MONOLÍTICO: myMapComponent.jsx**
**Ubicación:** `src/components/myMapComponent.jsx` (500+ líneas)  
**Problema:**
- Un componente hace: mapa, formulario, galería, API calls, realtime, compresión de imágenes
- Cada cambio de estado causa re-render de TODO
- Múltiples `useEffect` sin dependencias correctas
- **Impacto:** Re-renders en cascada, latencia UI

**Dependencias problemáticas:**
```javascript
// ❌ MALO: Se ejecuta en cada render
useEffect(() => {
  const cargarRegiones = async () => { ... };
  cargarRegiones();
}, []); // ← Falta algo

// ❌ MALO: tempMarker causa múltiples cargas
useEffect(() => {
  if (tempMarker) {
    cargarPerfil();  // Se llama cada vez que tempMarker cambia
  }
}, [tempMarker]);
```

**Solución:** Separar en componentes:
- `MapContainer` - Solo el mapa
- `ReportForm` - Formulario de reporte
- `ImageGallery` - Manejo de imágenes
- `MarkerPopup` - Info de marcadores

---

### 3. **LEAFLET CARGADO SIEMPRE (NO LAZY LOADING)**
**Ubicación:** `src/pages/Home.jsx`, `src/components/myMapComponent.jsx`  
**Problema:**
```javascript
// ❌ Se importa en el componente siempre
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, ... } from 'react-leaflet';
```
- Leaflet es pesado (~200KB minificado)
- Solo se usa en Home.jsx
- Se carga incluso en Login, Perfil, etc.

**Solución:** Lazy loading con React.lazy()
```javascript
const MyMapComponent = React.lazy(() => import('../components/myMapComponent'));
```

---

### 4. **FALTA MEMOIZACIÓN**
**Ubicación:** `src/components/myMapComponent.jsx`  
**Problema:**
```javascript
// ❌ Se recrea en cada render
function mapReporteToMarker(reporte) { ... }

// ❌ RiskCard sin memo
function RiskCard({ analysis }) { ... }

// ❌ Cada render recrea este array
{CONVERSATION_STARTERS.map((s) => (
  <button onClick={() => send(s.text)}>  // Nueva función cada vez
    {s.title}
  </button>
))}
```

**Solución:**
```javascript
import { memo, useCallback } from 'react';

// ✅ Evita re-renders innecesarios
const RiskCard = memo(({ analysis }) => {
  if (!analysis?.valid) return null;
  return <div>{/* ... */}</div>;
});

// ✅ Memoizar funciones
const handleSend = useCallback((text) => {
  send(text);
}, []);

// ✅ Usar useMemo
const mappers = useMemo(() => ({
  mapReporteToMarker,
}), []);
```

---

### 5. **MÚLTIPLES CONSOLE.LOG() EN PRODUCCIÓN**
**Ubicación:** `src/components/myMapComponent.jsx` (7+), `src/agent/agenteCora.js`  
**Problema:**
```javascript
console.log("Reportes cargados:", puntos.length, puntos);
console.debug('Realtime reportes payload:', payload);
console.log("Respuesta completa:", data);
// ...más logs
```
- Los console.log() ralentizan el navegador
- Especialmente con datos grandes (arrays de reportes)

**Solución:** Remover todos en producción o usar logger condicional:
```javascript
if (import.meta.env.DEV) {
  console.log("Debug info");
}
```

---

### 6. **COMPRESIÓN DE IMÁGENES SÍNCRONA (BLOQUEA UI)**
**Ubicación:** `src/components/myMapComponent.jsx` líneas 120-180  
**Problema:**
```javascript
// ❌ Síncrono, bloquea UI mientras se comprimen
const image = await fileToImage(file);
const canvas = document.createElement('canvas');
ctx.drawImage(image, 0, 0, width, height);
let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
```
- FileReader + Canvas son operaciones pesadas
- El usuario ve congelamiento

**Solución:** Usar Web Worker o mover a background:
```javascript
// ✅ Opción 1: Web Worker
const compressWorker = new Worker('/compress-worker.js');
compressWorker.postMessage({ file });
compressWorker.onmessage = (e) => {
  setImages(prev => [...prev, e.data]);
};

// ✅ Opción 2: Usar async con requestIdleCallback
requestIdleCallback(() => {
  compressImageFile(file);
});
```

---

### 7. **BACKEND: SIN PAGINACIÓN EN REPORTES**
**Ubicación:** `backend/server.js` línea 265  
**Problema:**
```javascript
// ❌ Trae TODOS los reportes sin límite
const reportesRaw = await sql`
  SELECT r.id, r.cantidad, ...
  FROM reportes r
  INNER JOIN usuarios u ON u.id = r.reportado_por
  LEFT JOIN regiones reg ON reg.id = r.region_id
  ORDER BY r.fecha_creacion DESC
`;
```
- Si hay 10,000 reportes, trae 10,000
- INNER + LEFT JOIN sin índices es lento
- Mapeo de cada reporte en JavaScript (línea 288)

**Solución:**
```javascript
// ✅ Agregar paginación
const page = req.query.page || 1;
const limit = req.query.limit || 50;
const offset = (page - 1) * limit;

const reportesRaw = await sql`
  SELECT ... FROM reportes r ...
  ORDER BY r.fecha_creacion DESC
  LIMIT ${limit} OFFSET ${offset}
`;

// ✅ Contar total
const { count } = await sql`SELECT COUNT(*) FROM reportes`;
return res.json({
  ok: true,
  reportes,
  total: count[0].count,
  page,
  pages: Math.ceil(count[0].count / limit)
});
```

---

### 8. **BACKEND: SIN ÍNDICES EN BASE DE DATOS**
**Ubicación:** Database setup (desconocido)  
**Problema:**
- Queries sin índices son O(n)
- `WHERE reportado_por = ${id}` escanea toda tabla
- `WHERE region_id = ${id}` sin índice

**Solución:** Crear índices
```sql
-- Agregar a migration/seed
CREATE INDEX idx_reportes_reportado_por ON reportes(reportado_por);
CREATE INDEX idx_reportes_region_id ON reportes(region_id);
CREATE INDEX idx_reportes_fecha ON reportes(fecha_creacion DESC);
CREATE INDEX idx_usuarios_correo ON usuarios(correo);

-- Para búsquedas geo espaciales (si se agrega)
CREATE INDEX idx_reportes_location ON reportes USING GIST(
  ll_to_earth(latitud, longitud)
);
```

---

### 9. **REALTIME SUPABASE SIN CLEANUP COMPLETO**
**Ubicación:** `src/components/myMapComponent.jsx` línea 340  
**Problema:**
```javascript
// ⚠️ Channel puede quedarse en memoria
const channel = supabase.channel('reportes-realtime')
  .on('postgres_changes', { ... }, (payload) => {
    console.debug('Realtime reportes payload:', payload);
    // ...
  });

channel.subscribe((status) => console.debug('MyMapComponent realtime status:', status));

// Cleanup
return () => {
  if (channel) {
    supabase.removeChannel(channel);  // ← Podría no ejecutarse
  }
};
```

**Solución:**
```javascript
// ✅ Cleanup mejorado
useEffect(() => {
  // ...subscription code...

  return () => {
    channel?.unsubscribe().then(() => {
      supabase.removeChannel(channel);
    });
  };
}, []); // Solo al montar/desmontar
```

---

### 10. **FRONTEND: SIN CACHÉ DE DATOS**
**Ubicación:** Múltiples lugares  
**Problema:**
```javascript
// Cada vez que se abre Home, se recargan todos los reportes
useEffect(() => {
  cargarReportes();  // API call siempre
}, []);
```

**Solución:** Implementar React Query o similar
```javascript
import { useQuery } from '@tanstack/react-query';

const { data: reportes, isLoading } = useQuery({
  queryKey: ['reportes'],
  queryFn: async () => {
    const res = await fetch('/api/reportes');
    return res.json();
  },
  staleTime: 5 * 60 * 1000, // Cachear 5 minutos
  cacheTime: 30 * 60 * 1000, // Mantener en RAM 30 min
});
```

---

## 📊 TABLA DE IMPACTO

| Problema | Facilidad | Impacto | Tiempo Est. |
|----------|-----------|--------|------------|
| Remover Firebase | 🟢 Muy fácil | 🔵 100KB ahorro | 5 min |
| Lazy loading Leaflet | 🟢 Fácil | 🔵 200KB ahorro | 15 min |
| Agregar memoización | 🟡 Medio | 🔴 50% menos renders | 30 min |
| Componentes separados | 🔴 Difícil | 🔴 Mayor impacto | 2 horas |
| Backend: Paginación | 🟡 Medio | 🔴 10x más rápido | 45 min |
| Backend: Índices BD | 🟡 Medio | 🔴 5x más rápido | 20 min |
| Remover console.log | 🟢 Fácil | 🟢 5-10% | 10 min |
| Imágenes async | 🔴 Difícil | 🔴 UI más fluida | 1.5 horas |

---

## ⚡ PLAN DE ACCIÓN (Prioridad)

### Fase 1: RÁPIDO (30 minutos) 🚀
1. ✅ Remover Firebase
2. ✅ Remover todos los console.log()
3. ✅ Lazy load Leaflet

### Fase 2: IMPACTO ALTO (2 horas)
4. ✅ Separar myMapComponent en 3 componentes
5. ✅ Agregar memoización
6. ✅ Backend: Paginación de reportes

### Fase 3: COMPLETO (3 horas)
7. ✅ Backend: Agregar índices
8. ✅ Compresión de imágenes con Worker
9. ✅ Implementar React Query para caché

---

## 🧪 Cómo medir mejora

```bash
# Medir bundle size
npm run build
# Ver tamaño antes/después

# Medir performance
# Abrir DevTools → Performance → Grabar → hacer acciones
# Buscar Long Tasks (> 50ms)
```

---

## 📌 Archivos a Modificar

```
PRIORITY: HIGH
├── package.json (remover firebase)
├── src/components/myMapComponent.jsx (separar en 3 componentes)
├── src/pages/Home.jsx (lazy loading)
├── backend/server.js (paginación, índices)
└── src/components/*.jsx (agregar memo, useCallback)

PRIORITY: MEDIUM
├── src/agent/agenteCora.js (remover logs)
└── src/lib/ (implementar caché)
```

---

¿Por cuál problema quieres que empecemos? Recomiendo en este orden:
1. Remover Firebase (5 min)
2. Lazy load Leaflet (15 min)
3. Separar myMapComponent (2 horas)
4. Agregar paginación backend (45 min)
