/**
 * Firestore "reportes" ↔ perfil posts.
 * Updated: 2026-06-04 — map sync + admin CRUD fields.
 */

import basura1 from "../assets/img/basura1.jpg";
import basura2 from "../assets/img/basura2.jpg";
import basura3 from "../assets/img/basura3.webp";
import { analyzeReport } from "../agent/agenteCora";

export const reportImagePool = [basura1, basura2, basura3];

export const WASTE_LABELS = {
  organico: "Orgánico",
  plastico: "Plástico",
  vidrio: "Vidrio",
  metal: "Envases metálicos",
  carton: "Cartón",
  papel: "Papel",
};

export const RISK_LABELS = {
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto",
};

export const hashStringToIndex = (value, modulo) => {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
};

const formatTimestamp = (data) => {
  if (data.fecha_creacion?.seconds) {
    return new Date(data.fecha_creacion.seconds * 1000).toLocaleString(
      "es-CR",
      { dateStyle: "short", timeStyle: "short" },
    );
  }
  return new Date().toLocaleString("es-CR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

export const firestoreDocToMarker = (docSnap) => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.reportado_por || "Anónimo",
    region: data.region || "",
    wasteType: data.tipo_residuo,
    amount: data.cantidad,
    slope: data.pendiente,
    waterProximity: data.cercania_agua,
    riskLevel: data.riesgo_contaminacion,
    materialType: data.clasificacion_material,
    verified: Boolean(data.verificado),
    timestamp: formatTimestamp(data),
    createdAt: data.fecha_creacion?.seconds
      ? data.fecha_creacion.seconds * 1000
      : null,
  };
};

export const buildMapPostDescription = (marker, analysis) => {
  const waste = WASTE_LABELS[marker.wasteType] || marker.wasteType || "—";
  const risk = RISK_LABELS[marker.riskLevel] || marker.riskLevel || "—";
  const amount =
    marker.amount !== undefined && marker.amount !== ""
      ? String(marker.amount)
      : "—";

  let text = `${marker.name} · ${marker.region || "Sin región"} · ${waste} · Cantidad ${amount} · Riesgo ${risk}`;
  if (marker.timestamp) {
    text += ` · ${marker.timestamp}`;
  }
  if (analysis?.valid) {
    text += `. AgenteCora: ${analysis.nivel} (${analysis.score}/100).`;
  }
  return text;
};

export const markerToProfilePost = (marker) => {
  const analysis = analyzeReport(marker);
  const wasteLabel =
    WASTE_LABELS[marker.wasteType] || marker.wasteType || "Residuo";
  const imageIndex = hashStringToIndex(marker.id, reportImagePool.length);

  return {
    id: marker.id,
    fromMap: true,
    title: `Reporte — ${wasteLabel}`,
    description: buildMapPostDescription(marker, analysis),
    image_url: reportImagePool[imageIndex],
    verified: marker.verified,
    name: marker.name,
    region: marker.region,
    wasteType: marker.wasteType,
    amount: marker.amount,
    riskLevel: marker.riskLevel,
    timestamp: marker.timestamp,
    materialType: marker.materialType,
    slope: marker.slope,
    waterProximity: marker.waterProximity,
    analysis,
    createdAt: marker.createdAt,
  };
};

export const firestoreDocToProfilePost = (docSnap) =>
  markerToProfilePost(firestoreDocToMarker(docSnap));

/** Map post edits → Firestore fields. */
export const profilePostToFirestore = (post) => ({
  reportado_por: post.name?.trim() || post.title || "Anónimo",
  region: post.region || "",
  tipo_residuo: post.wasteType || "organico",
  cantidad: Number(post.amount) || 0,
  riesgo_contaminacion: post.riskLevel || "bajo",
  verificado: Boolean(post.verified),
  pendiente: post.slope || "plano",
  cercania_agua: post.waterProximity || "˂50m",
  clasificacion_material: post.materialType || "reciclable",
});
