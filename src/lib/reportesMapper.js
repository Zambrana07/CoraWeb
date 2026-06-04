/**
 * Maps Firestore "reportes" documents to profile post objects.
 * Shared by Perfil (and aligned with Archivero / myMapComponent field names).
 *
 * Last updated: 2026-06-04 09:38 CST — map reportes → perfil posts integration.
 */

import basura1 from "../assets/img/basura1.jpg";
import basura2 from "../assets/img/basura2.jpg";
import basura3 from "../assets/img/basura3.webp";
import { analyzeReport } from "../agent/agenteCora";

export const reportImagePool = [basura1, basura2, basura3];

const WASTE_LABELS = {
  organico: "Orgánico",
  plastico: "Plástico",
  vidrio: "Vidrio",
  metal: "Envases metálicos",
  carton: "Cartón",
  papel: "Papel",
};

const RISK_LABELS = {
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

/** Raw marker shape used by myMapComponent / AgenteCora. */
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
    position:
      data.latitud && data.longitud
        ? [data.latitud, data.longitud]
        : null,
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

  let text = `Reportado por ${marker.name}. Tipo: ${waste}. Cantidad: ${amount}. Riesgo declarado: ${risk}.`;
  if (marker.region) {
    text += ` Región: ${marker.region}.`;
  }
  if (analysis?.valid) {
    text += ` AgenteCora: ${analysis.nivel} (${analysis.score}/100). ${analysis.recomendacion}`;
  }
  return text;
};

/** Profile grid post derived from a map report. */
export const markerToProfilePost = (marker) => {
  const analysis = analyzeReport(marker);
  const wasteLabel =
    WASTE_LABELS[marker.wasteType] || marker.wasteType || "Residuo";
  const imageIndex = hashStringToIndex(
    marker.id,
    reportImagePool.length,
  );

  return {
    id: marker.id,
    fromMap: true,
    title: `Reporte — ${wasteLabel}`,
    description: buildMapPostDescription(marker, analysis),
    image_url: reportImagePool[imageIndex],
    verified: false,
    name: marker.name,
    picture: reportImagePool[imageIndex],
    wasteType: marker.wasteType,
    amount: marker.amount,
    riskLevel: marker.riskLevel,
    region: marker.region,
    materialType: marker.materialType,
    slope: marker.slope,
    waterProximity: marker.waterProximity,
    analysis,
    createdAt: marker.createdAt,
  };
};

export const firestoreDocToProfilePost = (docSnap) =>
  markerToProfilePost(firestoreDocToMarker(docSnap));
