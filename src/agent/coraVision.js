// AgenteCora Vision - revisa las fotos del reporte antes de enviarlas al backend.
// Usa el clasificador NSFWJS (MobileNetV2) que corre en el navegador, sin enviar la imagen a ningun servidor.

// Umbral de probabilidad a partir del cual una categoria se considera contenido no adecuado.
const BLOCKED_CLASSES = {
  Porn: 0.5,
  Hentai: 0.5,
  Sexy: 0.75,
};

const CLASS_LABELS = {
  Porn: "contenido sexual explicito",
  Hentai: "contenido sexual ilustrado",
  Sexy: "contenido sugerente",
};

let modelPromise = null;

// El modelo pesa varios MB, por eso se carga bajo demanda la primera vez que se sube una foto.
// Se importa solo MobileNetV2 para no arrastrar los otros modelos de NSFWJS al bundle.
function loadModel() {
  if (!modelPromise) {
    modelPromise = Promise.all([
      import("nsfwjs/core"),
      import("nsfwjs/models/mobilenet_v2"),
    ]).then(([core, mobilenet]) =>
      core.load("MobileNetV2", { modelDefinitions: [mobilenet.MobileNetV2Model] })
    );
  }
  return modelPromise;
}

function dataUrlToImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen para revisarla."));
    img.src = dataUrl;
  });
}

// Devuelve { ok, motivo } para una imagen en formato data URL.
export async function reviewImage(dataUrl, fileName = "la imagen") {
  const model = await loadModel();
  const img = await dataUrlToImage(dataUrl);
  const predictions = await model.classify(img, 5);

  const scores = {};
  for (const prediction of predictions) {
    scores[prediction.className] = prediction.probability;
  }

  const blocked = Object.entries(BLOCKED_CLASSES).find(
    ([className, limit]) => (scores[className] ?? 0) >= limit
  );

  if (blocked) {
    const [className] = blocked;
    const porcentaje = Math.round((scores[className] ?? 0) * 100);
    return {
      ok: false,
      className,
      motivo: `AgenteCora detecto contenido no adecuado en ${fileName}: parece ${CLASS_LABELS[className]} (${porcentaje}% de certeza). Sube unicamente fotos del punto de residuos.`,
    };
  }

  return { ok: true, className: "Neutral", motivo: "" };
}
