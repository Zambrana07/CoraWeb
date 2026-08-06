// AgenteCora - motor integrado en CoraWeb.
// Asistente de reciclaje, residuos, clasificacion ambiental y uso de CoraWeb.
// Puede usar historial de conversacion y fuentes web (Wikipedia via backend).

export const SYSTEM_PROMPT = `Tu nombre es AgenteCora.
Ayudas con reciclaje, residuos, clasificacion ambiental y uso de la plataforma CoraWeb.
Respondes en espanol, corto, claro, amable y educativo.
Si el usuario habla con referencias ("eso", "y ese", "lo mismo"), usa el historial para entender.
Nunca des instrucciones peligrosas, sexuales, violentas, ilegales ni de hacking.
Si detectas un pedido indebido aunque use eufemismos, rechazalo con firmeza y amabilidad.
Cuando el usuario complete un formulario: analiza riesgo y recomienda.
Prioriza seguridad ambiental y humana.`;

// Nombres exactos de la interfaz. Sin esto el modelo inventa botones que no existen.
export const APP_FACTS = `Interfaz real de CoraWeb. Cita SIEMPRE estos nombres exactos y NUNCA inventes otros:
- Boton "Activar ubicacion" (arriba del mapa): muestra tu posicion en tiempo real. Se convierte en "Desactivar ubicacion".
- Boton "Ver ruta hasta aqui": aparece dentro del globo al hacer clic en un punto del mapa. Traza la ruta caminando.
- Boton "Eliminar punto": solo lo ven los administradores, dentro del globo del punto, y pide confirmacion.
- Reportar un punto: haz clic en cualquier parte del mapa y se abre el formulario. Los datos van a la izquierda y las fotos a la derecha.
- Las fotos se revisan automaticamente y se rechazan si tienen contenido no adecuado.
- "Archivero": historial de todos los reportes con comentarios. "Perfil": tus datos y tus reportes.
CoraWeb es una pagina web, no una app de telefono: la ubicacion se activa con el boton "Activar ubicacion" y el permiso del navegador, no en los ajustes del telefono.`;

export const OFF_TOPIC_REPLY =
  "Lo siento, solo puedo ayudar con temas relacionados con CoraWeb y gestion de residuos.";

export const UNSAFE_REPLY =
  "Eso no lo puedo ayudar. Estoy aqui para reciclaje, ambiente y el uso seguro de CoraWeb. Si tienes una duda de residuos o de la app, preguntame eso.";

export const NO_DATA_REPLY = "No tengo suficientes datos para determinar el nivel de riesgo.";

export const CONVERSATION_STARTERS = [
  { title: "Como clasifico residuos?", text: "Como identifico y separo residuos en mi hogar o empresa?" },
  { title: "Que significa riesgo rojo?", text: "Que significan los niveles de riesgo y como actuar ante un riesgo rojo?" },
  { title: "Que hago con baterias usadas?", text: "Como manejo y reciclo baterias usadas de forma segura?" },
  { title: "Como lleno el formulario?", text: "Como completo el formulario de riesgos ambientales en el mapa?" },
  { title: "Reciclable vs no reciclable", text: "Que diferencia hay entre material reciclable y no reciclable?" },
];

// --- VALORES DE RIESGO POR OPCION DEL FORMULARIO ---
export const RISK_VALUES = {
  wasteType: { organico: 5, papel: 3, carton: 3, vidrio: 8, plastico: 12, metal: 10 },
  slope: { plano: 2, leve: 6, pronunciada: 12, intensa: 18 },
  waterProximity: { "˂50m": 25, "≥100m": 12, "≥500m": 4 },
  riskLevel: { bajo: 5, medio: 15, alto: 30 },
  materialType: { reciclable: 3, "no reciclable": 12 },
};

const FACTOR_MAX = {
  wasteType: 12,
  slope: 18,
  waterProximity: 25,
  riskLevel: 30,
  materialType: 12,
  amount: 25,
};

const MAX_SCORE = Object.values(FACTOR_MAX).reduce((a, b) => a + b, 0);

const amountToScore = (raw) => {
  const amount = Number(raw);
  if (!amount || amount <= 0) return 0;
  if (amount <= 10) return 5;
  if (amount <= 50) return 10;
  if (amount <= 200) return 18;
  return 25;
};

const LEVELS = {
  verde: { nivel: "Bajo", color: "verde", hex: "#2e7d32" },
  amarillo: { nivel: "Moderado", color: "amarillo", hex: "#c9a227" },
  rojo: { nivel: "Alto", color: "rojo", hex: "#c62828" },
};

const FACTOR_TIPS = {
  waterProximity:
    "El punto esta muy cerca de un cuerpo de agua. Retira los residuos con prioridad y usa contencion para evitar lixiviados.",
  riskLevel:
    "El riesgo de contaminacion es elevado. Usa guantes, separa el material y reportalo a la cuadrilla de manejo.",
  slope:
    "La pendiente favorece el arrastre por lluvia. Cubre o asegura el material para evitar que se disperse.",
  wasteType:
    "Predomina material persistente (plastico/metal). Separalo para reciclaje y evita que llegue al suelo o al agua.",
  amount: "El volumen es elevado. Coordina una recoleccion programada en lugar de manejo manual.",
  materialType:
    "El material no es reciclable. Disponlo en el contenedor de residuos no aprovechables.",
};

const BASE_RECOMMENDATION = {
  verde: "Riesgo bajo: puede manejarse con recoleccion y separacion normal.",
  amarillo: "Riesgo moderado: maneja el punto con precaucion y retira los residuos pronto.",
  rojo: "Riesgo alto: requiere atencion prioritaria y manejo cuidadoso.",
};

const normalizeWaterProximity = (value) => {
  if (!value) return value;
  const str = String(value).trim().toLowerCase();
  if (str.includes("50") && !str.includes("100") && !str.includes("500")) return "˂50m";
  if (str.includes("100") && !str.includes("500")) return "≥100m";
  if (str.includes("500")) return "≥500m";
  return value;
};

const normalizeValue = (value, field) => {
  if (!value) return value;
  const str = String(value).trim().toLowerCase();

  switch (field) {
    case "wasteType":
      if (str.includes("org")) return "organico";
      if (str.includes("pap")) return "papel";
      if (str.includes("cart")) return "carton";
      if (str.includes("vid")) return "vidrio";
      if (str.includes("plast")) return "plastico";
      if (str.includes("metal")) return "metal";
      break;
    case "slope":
      if (str === "plano") return "plano";
      if (str === "leve") return "leve";
      if (str.includes("pronun")) return "pronunciada";
      if (str.includes("intent") || str.includes("intensa")) return "intensa";
      break;
    case "riskLevel":
      if (str === "bajo") return "bajo";
      if (str === "medio") return "medio";
      if (str === "alto") return "alto";
      break;
    case "materialType":
      if (str.includes("no") && str.includes("recicl")) return "no reciclable";
      if (str.includes("recicl")) return "reciclable";
      break;
  }

  return str;
};

export function analyzeReport(form) {
  if (!form || (!form.wasteType && !form.riskLevel && !form.waterProximity)) {
    return { valid: false, message: NO_DATA_REPLY };
  }

  const normalized = {
    wasteType: normalizeValue(form.wasteType, "wasteType"),
    slope: normalizeValue(form.slope, "slope"),
    waterProximity: normalizeWaterProximity(form.waterProximity),
    riskLevel: normalizeValue(form.riskLevel, "riskLevel"),
    materialType: normalizeValue(form.materialType, "materialType"),
  };

  const contributions = {
    wasteType: RISK_VALUES.wasteType[normalized.wasteType] ?? 0,
    slope: RISK_VALUES.slope[normalized.slope] ?? 0,
    waterProximity: RISK_VALUES.waterProximity[normalized.waterProximity] ?? 0,
    riskLevel: RISK_VALUES.riskLevel[normalized.riskLevel] ?? 0,
    materialType: RISK_VALUES.materialType[normalized.materialType] ?? 0,
    amount: amountToScore(form.amount),
  };

  const rawScore = Object.values(contributions).reduce((a, b) => a + b, 0);
  const score = Math.round((rawScore / MAX_SCORE) * 100);

  let key = "verde";
  if (score > 66) key = "rojo";
  else if (score > 33) key = "amarillo";
  const level = LEVELS[key];

  const dominant = Object.entries(contributions).sort((a, b) => b[1] - a[1])[0][0];
  const explicacion = `Puntaje ${score}/100 segun tipo de residuo, cantidad, pendiente, cercania al agua, riesgo declarado y clasificacion del material.`;
  const recomendacion = `${BASE_RECOMMENDATION[key]} ${FACTOR_TIPS[dominant] || ""}`.trim();

  return {
    valid: true,
    score,
    nivel: level.nivel,
    color: level.color,
    hex: level.hex,
    explicacion,
    recomendacion,
    breakdown: contributions,
  };
}

// --- COMPRENSION DEL CHAT ---
const normalize = (t) =>
  (t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const has = (msg, words) => words.some((w) => msg.includes(w));

const scoreIntent = (msg, phrases) => {
  let score = 0;
  for (const phrase of phrases) {
    if (msg.includes(phrase)) score += phrase.includes(" ") ? 3 : 1;
  }
  return score;
};

const MATERIAL_TIPS = {
  bateria:
    "Las baterias y pilas no van a la basura comun, porque sus metales contaminan el suelo y el agua. Guardalas secas en un frasco aparte y llevalas a un punto de recoleccion de residuos especiales. Nunca las quemes ni las perfores.",
  plastico:
    "Con el plastico lo mejor es enjuagarlo, secarlo y aplastarlo para que ocupe menos. Separalo del resto y evita que llegue a rios o quebradas, porque se degrada en microplasticos.",
  vidrio:
    "El vidrio se puede reciclar muchisimas veces sin perder calidad. Enjuagalo, manejalo con cuidado por los cortes y guardalo en un recipiente aparte.",
  metal:
    "Las latas y envases metalicos son reciclables. Enjuagalos para quitar restos de comida y aplastalos para ahorrar espacio antes de llevarlos al punto de reciclaje.",
  organico:
    "Los restos organicos como comida o hojas puedes compostarlos para hacer abono. Mantenlos separados de los reciclables para no ensuciarlos.",
  papel:
    "El papel y el carton se reciclan bien si estan limpios y secos. Si estan manchados de grasa o comida ya no sirven para reciclaje y van a residuos comunes.",
  electronico:
    "Los aparatos electronicos llevan materiales peligrosos, asi que no van a la basura comun. Llevalos a un punto autorizado de reciclaje electronico.",
  aceite:
    "El aceite usado nunca al drenaje ni al suelo. Guardalo en una botella bien cerrada y entregalo en un punto de recoleccion, porque muy poca cantidad contamina mucha agua.",
};

const detectMaterial = (msg) => {
  if (has(msg, ["bateria", "pila", "pilas"])) return "bateria";
  if (has(msg, ["plastic", "pet", "botella"])) return "plastico";
  if (has(msg, ["vidrio"])) return "vidrio";
  if (has(msg, ["metal", "lata", "envase"])) return "metal";
  if (has(msg, ["organic", "comida", "compost", "abono", "cascara"])) return "organico";
  if (has(msg, ["papel", "carton"])) return "papel";
  if (has(msg, ["electronic", "aparato", "celular", "computad", "telefono", "laptop"])) return "electronico";
  if (has(msg, ["aceite"])) return "aceite";
  return null;
};

// Detecta pedidos indebidos aunque usen eufemismos / rodeos.
export function detectUnsafeIntent(text) {
  const msg = normalize(text);
  if (!msg) return false;

  const hard = [
    "porn", "xxx", "nsfw", "desnud", "sexo", "sexual", "pene", "vagina", "coger",
    "hack", "malware", "ransomware", "phishing", "ddos",
    "bomba", "explosiv", "arma", "dispar", "matar", "asesin",
    "droga", "cocaina", "marihuana", "metanfet", "fentanil",
    "suicid", "autoles", "como morir",
  ];
  if (has(msg, hard)) return true;

  const softPairs = [
    ["foto", "sin ropa"],
    ["manda", "nudes"],
    ["contenido", "adulto"],
    ["romper", "contrasena"],
    ["entrar", "cuenta ajena"],
    ["saltar", "seguridad"],
    ["como fabricar", "arma"],
    ["como hacer", "bomba"],
    ["donde comprar", "droga"],
  ];

  return softPairs.some(([a, b]) => msg.includes(a) && msg.includes(b));
}

function extractTopicFromHistory(history = []) {
  const recent = [...history].reverse();
  for (const item of recent) {
    const msg = normalize(item?.text || "");
    const material = detectMaterial(msg);
    if (material) return { type: "material", value: material };

    if (has(msg, ["ruta", "como llegar", "waze"])) return { type: "feature", value: "ruta" };
    if (has(msg, ["ubicacion", "gps", "mi posicion"])) return { type: "feature", value: "ubicacion" };
    if (has(msg, ["formulario", "reporte", "registrar punto"])) return { type: "feature", value: "formulario" };
    if (has(msg, ["archivero"])) return { type: "feature", value: "archivero" };
    if (has(msg, ["riesgo", "verde", "amarillo", "rojo"])) return { type: "feature", value: "riesgo" };
    if (has(msg, ["mapa", "coraweb", "tutorial", "recorrido"])) return { type: "feature", value: "tour" };
  }
  return null;
}

function isFollowUp(msg) {
  return has(msg, [
    "y eso", "y ese", "y esa", "y esos", "lo mismo", "eso mismo", "y tambien",
    "y las", "y los", "otra vez", "mas info", "mas informacion", "y como",
    "entonces", "ok y", "vale y", "perfecto y", "gracias y", "si pero",
    "y que", "que mas", "continua", "sigue", "explica mejor", "mas detalle",
  ]) || /^(y|ok|vale|si|sí|eso|ese|esa)\b/.test(msg);
}

function replyForFeature(feature) {
  switch (feature) {
    case "ruta":
      return {
        text: "Activa tu ubicacion, toca el punto del mapa y usa \"Ver ruta hasta aqui\". Te muestro distancia y tiempo estimado a pie.",
      };
    case "ubicacion":
      return {
        text: "Toca \"Activar mi ubicacion\" arriba a la izquierda. El mapa te sigue en tiempo real mientras te moves.",
        action: "tour",
      };
    case "formulario":
      return {
        text: "En modo registro haz clic en el mapa. El formulario pide region, tipo de residuo, cantidad, pendiente, cercania al agua, riesgo y si es reciclable. Al guardar te calculo el riesgo.",
      };
    case "archivero":
      return {
        text: "En Archivero ves todos los puntos reportados, sus imagenes, riesgos y comentarios. Tambien puedes abrir un punto desde tu perfil.",
      };
    case "riesgo":
      return {
        text: "Verde es riesgo bajo, amarillo moderado y rojo alto. Sale de combinar tipo de residuo, cantidad, pendiente, cercania al agua y contaminacion.",
      };
    case "tour":
      return {
        text: "Te hago un recorrido rapido por CoraWeb: ubicacion, registrar punto, formulario y el menu de abajo.",
        action: "tour",
      };
    default:
      return null;
  }
}

function withWiki(text, wiki) {
  if (!wiki?.extract) return text;
  const source = wiki.title ? ` (fuente: Wikipedia - ${wiki.title})` : " (fuente: Wikipedia)";
  return `${text}\n\nDato util${source}: ${wiki.extract.slice(0, 420)}${wiki.extract.length > 420 ? "..." : ""}`;
}

/**
 * Responde con conciencia de historial.
 * @returns {{ text: string, action?: string|null, unsafe?: boolean }}
 */
export function answerQuestion(text, history = [], options = {}) {
  const msg = normalize(text);
  if (!msg) return { text: NO_DATA_REPLY };

  if (detectUnsafeIntent(text)) {
    return { text: UNSAFE_REPLY, unsafe: true };
  }

  const topic = extractTopicFromHistory(history);
  const followUp = isFollowUp(msg);

  // Continuaciones: "y eso?", "lo mismo con vidrio", etc.
  if (followUp && topic) {
    if (topic.type === "material") {
      const mentioned = detectMaterial(msg);
      if (mentioned) return { text: MATERIAL_TIPS[mentioned] };
      return {
        text: `${MATERIAL_TIPS[topic.value]} Si quieres, dime otro material y te digo como manejarlo.`,
      };
    }
    if (topic.type === "feature") {
      const again = replyForFeature(topic.value);
      if (again) return again;
    }
  }

  // Intenciones con puntaje (menos rigido que if/else de una sola palabra)
  const intents = [
    {
      name: "greeting",
      score: scoreIntent(msg, ["hola", "buenas", "buenos dias", "buenas tardes", "que tal", "hey", "saludos", "ola"]),
      reply: {
        text: "Hola, que gusto. Soy AgenteCora: te ayudo con reciclaje, riesgos ambientales y a moverte por CoraWeb. Que necesitas?",
      },
    },
    {
      name: "thanks",
      score: scoreIntent(msg, ["gracias", "genial", "perfecto", "excelente", "buenisimo", "thanks"]),
      reply: { text: "Con mucho gusto. Si surge otra duda de residuos o de la app, aqui estoy." },
    },
    {
      name: "tour",
      score: scoreIntent(msg, [
        "como uso", "como se usa", "como funciona", "tutorial", "guia", "guiame", "ensename",
        "recorrido", "primeros pasos", "que puedo hacer", "explicame la app", "como empiezo",
        "muestrame la app", "ayudame a usar",
      ]),
      reply: {
        text: "Dale, te hago un recorrido rapido y te senalo cada parte: ubicacion, registrar un punto, formulario y el menu de abajo.",
        action: "tour",
      },
    },
    {
      name: "addPoint",
      score: scoreIntent(msg, [
        "agregar punto", "registrar punto", "crear punto", "marcar punto", "reportar",
        "como reporto", "como agrego", "poner un punto",
      ]),
      reply: {
        text: "Activa \"Registrar punto de localizacion de residuos\", haz clic en el mapa y completa el formulario. Si quieres te lo senalo en pantalla.",
        action: "tour",
      },
    },
    {
      name: "route",
      score: scoreIntent(msg, ["ruta", "como llego", "como llegar", "direcciones", "waze", "ir al punto", "distancia"]),
      reply: replyForFeature("ruta"),
    },
    {
      name: "location",
      score: scoreIntent(msg, ["ubicacion", "gps", "donde estoy", "mi posicion", "localiz", "centrar el mapa"]),
      reply: replyForFeature("ubicacion"),
    },
    {
      name: "form",
      score: scoreIntent(msg, ["formulario", "llenar", "rellenar", "que pongo", "campos", "que datos"]),
      reply: replyForFeature("formulario"),
    },
    {
      name: "nav",
      score: scoreIntent(msg, ["footer", "menu", "botones de abajo", "archivero", "perfil", "web informativa", "secciones"]),
      reply: {
        text: "Abajo tienes Home (mapa), Archivero, Web informativa y Perfil. El Archivero concentra los reportes con su riesgo.",
        action: "tour",
      },
    },
    {
      name: "risk",
      score: scoreIntent(msg, ["riesgo", "verde", "amarillo", "rojo", "nivel", "calificacion", "peligro"]),
      reply: replyForFeature("riesgo"),
    },
    {
      name: "recycleSplit",
      score: scoreIntent(msg, ["reciclable", "no reciclable", "se recicla", "clasific", "separ", "como reciclo", "que va donde"]),
      reply: {
        text: "Separa por tipo: organico, papel/carton, plastico, vidrio y metal. Lo limpio y seco se recicla mejor; lo grasiento o mezclado suele ir a no reciclable.",
      },
    },
    {
      name: "water",
      score: scoreIntent(msg, ["agua", "rio", "quebrada", "lixiviado", "cercania"]),
      reply: {
        text: "Mientras mas cerca del agua este un residuo, mayor es el riesgo por lixiviados. Esos puntos tienen prioridad de retiro y conviene contenerlos.",
      },
    },
    {
      name: "about",
      score: scoreIntent(msg, ["coraweb", "que es cora", "la plataforma", "para que sirve", "la app", "la pagina"]),
      reply: {
        text: "CoraWeb sirve para mapear y gestionar puntos de residuos: los registras en el mapa, los revisas en Archivero y yo te ayudo a clasificar riesgo. Quieres un recorrido?",
        action: "tour",
      },
    },
  ];

  intents.sort((a, b) => b.score - a.score);
  const best = intents[0];
  if (best && best.score >= 2) {
    return best.reply;
  }

  const material = detectMaterial(msg);
  if (material) {
    if (has(msg, ["manej", "gestion", "que hago", "como trato", "desechar", "botar", "tirar", "disponer"])) {
      return { text: MATERIAL_TIPS[material] };
    }
    return { text: MATERIAL_TIPS[material] };
  }

  if (options.wiki?.extract) {
    return {
      text: withWiki(
        "Te resumo lo mas util para gestion de residuos / ambiente con una fuente abierta:",
        options.wiki
      ),
    };
  }

  // Si hay tema reciente, no cortes la conversacion de golpe.
  if (topic?.type === "material") {
    return {
      text: `Si hablamos de ${topic.value}, puedo darte el paso a paso o compararlo con otro material. Tambien te ayudo con el mapa y el formulario de CoraWeb.`,
    };
  }

  if (best && best.score >= 1) {
    return best.reply;
  }

  // Preguntas vagas pero conversacionales: pedir aclaracion en vez de cortar.
  if (msg.length < 18 || has(msg, ["ayuda", "duda", "pregunta", "info", "informacion"])) {
    return {
      text: "Claro. Puedo ayudarte con clasificar residuos, riesgos del mapa, rutas, ubicacion o como usar CoraWeb. Que parte te interesa?",
    };
  }

  return {
    text: "Puedo ayudarte si lo enfocamos a reciclaje, ambiente o CoraWeb. Por ejemplo: como separar plastico, que significa riesgo rojo, o como registrar un punto.",
  };
}
