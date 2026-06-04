// AgenteCora - motor integrado en CoraWeb.
// Asistente limitado a reciclaje, residuos, clasificacion ambiental y uso de CoraWeb.
// La logica de abajo implementa, sin dependencias externas, las reglas del system prompt.

export const SYSTEM_PROMPT = `Tu nombre es AgenteCora.
Solo respondes temas relacionados con reciclaje, residuos, clasificacion ambiental y uso de la plataforma CoraWeb.
Si una pregunta no pertenece al contexto responde:
"Lo siento, solo puedo ayudar con temas relacionados con CoraWeb y gestion de residuos."

Manten respuestas cortas, claras, seguras y educativas.
Nunca proporciones instrucciones peligrosas ni contenido fuera del contexto ambiental.

Cuando el usuario complete un formulario: analiza las respuestas, calcula el riesgo y devuelve nivel, color, explicacion y recomendacion.
Si no hay suficiente informacion: "No tengo suficientes datos para determinar el nivel de riesgo."
Nunca alarmes innecesariamente. Usa lenguaje amigable y educativo. Prioriza la seguridad ambiental y humana.`;

export const OFF_TOPIC_REPLY =
  "Lo siento, solo puedo ayudar con temas relacionados con CoraWeb y gestion de residuos.";

export const NO_DATA_REPLY = "No tengo suficientes datos para determinar el nivel de riesgo.";

export const CONVERSATION_STARTERS = [
  { title: "Como clasifico residuos?", text: "Como identifico y separo residuos en mi hogar o empresa?" },
  { title: "Que significa riesgo rojo?", text: "Que significan los niveles de riesgo y como actuar ante un riesgo rojo?" },
  { title: "Que hago con baterias usadas?", text: "Como manejo y reciclo baterias usadas de forma segura?" },
  { title: "Como lleno el formulario?", text: "Como completo el formulario de riesgos ambientales en el mapa?" },
  { title: "Reciclable vs no reciclable", text: "Que diferencia hay entre material reciclable y no reciclable?" },
];

// --- VALORES DE RIESGO POR OPCION DEL FORMULARIO ---
// Cada opcion del formulario de CoraWeb tiene un puntaje de riesgo asignado.
export const RISK_VALUES = {
  wasteType: { organico: 5, papel: 3, carton: 3, vidrio: 8, plastico: 12, metal: 10 },
  slope: { plano: 2, leve: 6, pronunciada: 12, intensa: 18 },
  waterProximity: { "\u02C250m": 25, "\u2265100m": 12, "\u2265500m": 4 },
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

// Analiza un reporte/formulario y devuelve nivel, color, explicacion y recomendacion.
export function analyzeReport(form) {
  if (!form || (!form.wasteType && !form.riskLevel && !form.waterProximity)) {
    return { valid: false, message: NO_DATA_REPLY };
  }

  const contributions = {
    wasteType: RISK_VALUES.wasteType[form.wasteType] ?? 0,
    slope: RISK_VALUES.slope[form.slope] ?? 0,
    waterProximity: RISK_VALUES.waterProximity[form.waterProximity] ?? 0,
    riskLevel: RISK_VALUES.riskLevel[form.riskLevel] ?? 0,
    materialType: RISK_VALUES.materialType[form.materialType] ?? 0,
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

// --- COMPRENSION DEL CHAT (lenguaje natural) ---
const normalize = (t) =>
  (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const has = (msg, words) => words.some((w) => msg.includes(w));

const ALLOWED_KEYWORDS = [
  "recicl", "residuo", "basura", "desecho", "organic", "plastic", "vidrio", "metal",
  "carton", "papel", "bateria", "pila", "compost", "contamina", "riesgo", "ambient",
  "clasific", "separ", "coraweb", "cora", "mapa", "formulario", "reporte", "punto",
  "agua", "pendiente", "verde", "amarillo", "rojo", "color", "nivel", "material",
  "archivero", "electronic", "aceite", "quimico", "vertedero", "reduc", "reutiliz",
  "lata", "envase", "abono", "limpiar", "manej", "gestion",
];

const BANNED_KEYWORDS = [
  "politic", "hack", "violen", "sexual", "arma", "droga", "bomba", "medicina",
  "medicamento", "virus informatic", "malware", "porno", "religion", "futbol",
];

const MATERIAL_TIPS = {
  bateria:
    "Las baterias y pilas no van a la basura comun, porque sus metales contaminan el suelo y el agua. Guardalas secas en un frasco aparte y llevalas a un punto de recoleccion de residuos especiales. Nunca las quemes ni las perfores.",
  plastico:
    "Con el plastico lo mejor es enjuagarlo, secarlo y aplastarlo para que ocupe menos. Sepáralo del resto y evita que llegue a rios o quebradas, porque se degrada en microplasticos.",
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
  if (has(msg, ["bateria", "pila"])) return "bateria";
  if (has(msg, ["plastic"])) return "plastico";
  if (has(msg, ["vidrio"])) return "vidrio";
  if (has(msg, ["metal", "lata", "envase"])) return "metal";
  if (has(msg, ["organic", "comida", "compost", "abono"])) return "organico";
  if (has(msg, ["papel", "carton"])) return "papel";
  if (has(msg, ["electronic", "aparato", "celular", "computad", "telefono"])) return "electronico";
  if (has(msg, ["aceite"])) return "aceite";
  return null;
};

// Responde una pregunta del usuario en lenguaje natural, dentro del contexto de CoraWeb.
// Devuelve { text, action? }. action: 'tour' inicia el recorrido guiado.
export function answerQuestion(text) {
  const msg = normalize(text);
  if (!msg) return { text: NO_DATA_REPLY };

  if (has(msg, BANNED_KEYWORDS)) return { text: OFF_TOPIC_REPLY };

  if (has(msg, ["hola", "buenas", "buenos dias", "buenas tardes", "que tal", "hey", "saludos", "ola"])) {
    return {
      text: "Hola, que gusto verte. Soy AgenteCora y te ayudo a clasificar residuos, entender los niveles de riesgo y moverte por CoraWeb. En que andas?",
    };
  }

  if (has(msg, ["gracias", "genial", "perfecto", "excelente", "buenisimo"])) {
    return { text: "Con mucho gusto. Aqui sigo por si surge algo mas sobre reciclaje o la plataforma." };
  }

  if (
    has(msg, [
      "como uso", "como se usa", "como funciona", "tutorial", "como utiliz",
      "guia", "guiame", "ensename", "no se usar", "como navego",
      "primeros pasos", "recorrido", "muestrame la app", "muestrame como",
      "como empiezo", "donde empiezo", "como inicio", "por donde empiezo",
      "que puedo hacer", "que se puede hacer", "que hago aqui", "que hago en esta",
      "que hace esta app", "que hace esta pagina", "que ofrece esta", "que tiene esta app",
      "para que sirve esta app", "para que sirve esta pagina", "para que es esta app",
      "explicame la app", "explicame esta app", "explicame la pagina", "explicame como",
      "ayudame a usar", "ayudame con la app", "ensename a usar", "ensename como",
      "que opciones hay", "que opciones tengo", "que funciones tiene", "que se hace aqui",
      "como me muevo", "como uso esta", "como utilizo esta", "como funciona esta",
    ])
  ) {
    return {
      text: "Dale, te hago un recorrido rapido y te voy senalando cada parte: como activar tu ubicacion, registrar un punto, llenar el formulario y el menu de abajo. Mira la pantalla, ahi va. (Puedes pedirmelo tambien diciendo \"como uso la app\", \"que puedo hacer aqui\", \"tutorial\" o \"explicame la app\").",
      action: "tour",
    };
  }

  if (has(msg, ["agregar punto", "agrego un punto", "anadir punto", "registrar punto", "crear punto", "marcar punto", "poner un punto", "reportar", "como reporto", "como agrego"])) {
    return {
      text: "Para registrar un punto activa el modo \"Registrar punto de localizacion de residuos\", haz clic en el mapa donde estan los residuos y llena el formulario. Te lo voy senalando.",
      action: "tour",
    };
  }

  if (has(msg, ["ubicacion", "ubicar", "localiz", "donde estoy", "mi posicion", "gps", "centrar el mapa"])) {
    return {
      text: "Toca el boton \"Activar mi ubicacion\" arriba a la izquierda y el mapa te lleva a tu posicion actual. Te lo muestro en pantalla.",
      action: "tour",
    };
  }

  if (has(msg, ["formulario", "llenar", "rellenar", "que pongo", "campos", "que datos"])) {
    return {
      text: "El formulario aparece cuando haces clic en el mapa estando en modo registro. Te pide tu nombre, la region, el tipo de residuo, la cantidad, la pendiente del terreno, que tan cerca esta del agua, el riesgo y si es reciclable. Apenas lo guardas, te calculo el nivel de riesgo y lo veras con su color.",
    };
  }

  if (has(msg, ["footer", "menu", "navegar", "iconos", "botones de abajo", "secciones", "perfil", "web informativa"])) {
    return {
      text: "En el menu de abajo tienes Home, que es el mapa; Archivero, donde estan todos los puntos reportados con su riesgo; Web informativa; y Perfil. Te lo senalo si quieres.",
      action: "tour",
    };
  }

  if (has(msg, ["manej", "gestion", "que hago con", "como trato", "disponer", "desechar", "botar", "tirar", "deshacerme", "que hago si"])) {
    const mat = detectMaterial(msg);
    if (mat) return { text: MATERIAL_TIPS[mat] };
    return {
      text: "Depende del tipo de residuo, pero la idea base es la misma: separalo por material, mantenlo limpio y seco, y llevalo al punto que le corresponde. Si me decis que residuo es (plastico, vidrio, metal, organico, baterias, electronicos...) te doy los pasos exactos.",
    };
  }

  const mat = detectMaterial(msg);
  if (mat) return { text: MATERIAL_TIPS[mat] };

  if (has(msg, ["riesgo", "color", "verde", "amarillo", "rojo", "nivel", "peligro", "calificacion"])) {
    return {
      text: "Califico cada punto con un color: verde es riesgo bajo y se maneja normal; amarillo es riesgo moderado, conviene retirarlo pronto; y rojo es riesgo alto, necesita atencion prioritaria. El color sale de combinar el tipo de residuo, la cantidad, la pendiente, la cercania al agua y el nivel de contaminacion.",
    };
  }

  if (has(msg, ["reciclable", "no reciclable", "se recicla", "sirve para recicl"])) {
    return {
      text: "Reciclable es todo lo que se puede reaprovechar: papel y carton limpios, plastico, vidrio y metal. No reciclable es lo que esta contaminado o mezclado y va a residuos comunes. Si dudas con un punto, marcalo en el formulario y yo lo evaluo.",
    };
  }

  if (has(msg, ["clasific", "separ", "como reciclo", "que va donde", "ordenar"])) {
    return {
      text: "La clave esta en separar por tipo: organico, papel y carton, plastico, vidrio y metal. Manten cada grupo limpio y seco para que se pueda reciclar. En el mapa puedes registrar cada punto con su tipo de residuo.",
    };
  }

  if (has(msg, ["coraweb", "que es cora", "la plataforma", "la app", "la pagina", "para que sirve"])) {
    return {
      text: "CoraWeb es una plataforma para mapear y gestionar puntos de residuos en la comunidad. Registras reportes en el mapa, los exploras en el Archivero y yo te ayudo a clasificarlos y a entender su riesgo. Quieres que te haga un recorrido?",
      action: "tour",
    };
  }

  if (has(msg, ["agua", "rio", "quebrada", "cercania", "lixiviado"])) {
    return {
      text: "Mientras mas cerca esta un residuo de un cuerpo de agua, mayor es el riesgo de contaminacion por lixiviados. Esos puntos tienen prioridad de retiro y conviene usar barreras de contencion.",
    };
  }

  if (has(msg, ALLOWED_KEYWORDS)) {
    return {
      text: "Eso te lo puedo ayudar. Me das un poco mas de detalle? Por ejemplo, que residuo es o que parte de CoraWeb quieres usar.",
    };
  }

  return { text: OFF_TOPIC_REPLY };
}
