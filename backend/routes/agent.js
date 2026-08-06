import express from "express";
import {
  answerQuestion,
  detectUnsafeIntent,
  SYSTEM_PROMPT,
  APP_FACTS,
  OFF_TOPIC_REPLY,
  UNSAFE_REPLY,
} from "../../src/agent/agenteCora.js";

const router = express.Router();

const MAX_HISTORY = 8;
const MAX_MESSAGE_LENGTH = 1200;
const GEMINI_TIMEOUT_MS = 12000;
const WIKI_TIMEOUT_MS = 4000;

// Sin timeout una llamada colgada deja el chat en "pensando..." para siempre.
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-MAX_HISTORY)
    .map((item) => ({
      from: item?.from === "bot" ? "bot" : "user",
      text: String(item?.text || "").slice(0, MAX_MESSAGE_LENGTH).trim(),
    }))
    .filter((item) => item.text);
}

function buildGeminiContents(history, message) {
  const contents = [];
  for (const item of history) {
    contents.push({
      role: item.from === "bot" ? "model" : "user",
      parts: [{ text: item.text }],
    });
  }
  contents.push({
    role: "user",
    parts: [{ text: message }],
  });
  return contents;
}

async function searchWikipedia(query) {
  try {
    const searchUrl =
      "https://es.wikipedia.org/w/api.php?action=opensearch&limit=3&namespace=0&format=json&origin=*&search=" +
      encodeURIComponent(query);
    const searchRes = await fetchWithTimeout(searchUrl, {}, WIKI_TIMEOUT_MS);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const titles = searchData?.[1] || [];
    if (!titles.length) return null;

    const title = titles[0];
    const summaryRes = await fetchWithTimeout(
      "https://es.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title),
      {},
      WIKI_TIMEOUT_MS
    );
    if (!summaryRes.ok) return null;
    const summary = await summaryRes.json();
    if (!summary?.extract) return null;

    return {
      title: summary.title || title,
      extract: String(summary.extract).slice(0, 900),
      url: summary.content_urls?.desktop?.page || null,
    };
  } catch {
    return null;
  }
}

function looksLikeResearchQuery(text) {
  const msg = String(text || "").toLowerCase();
  return /(que es|qué es|como se|cómo se|buscar|investiga|informacion|información|wikipedia|datos sobre|explica|donde se|dónde se|punto de recoleccion|punto de recolección)/.test(
    msg
  );
}

function parseAgentJson(raw) {
  if (!raw) return null;
  const cleaned = String(raw)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { text: cleaned, action: null, unsafe: false };
  }

  if (typeof parsed === "string") {
    return { text: parsed, action: null, unsafe: false };
  }

  const text =
    parsed.text ||
    parsed.mensaje ||
    parsed.message ||
    parsed.respuesta ||
    (Array.isArray(parsed.pasos) ? [parsed.mensaje, ...parsed.pasos].filter(Boolean).join("\n") : null) ||
    cleaned;

  return {
    text: String(text).trim(),
    action: parsed.action === "tour" ? "tour" : null,
    unsafe: Boolean(parsed.unsafe),
  };
}

async function askGemini({ message, history, wiki }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const wikiBlock = wiki
    ? `\nFuente web (Wikipedia): ${wiki.title} - ${wiki.extract}\nUsala solo si ayuda y menciona que viene de Wikipedia.`
    : "";

  const system = `${SYSTEM_PROMPT}

Reglas de conversacion:
- Usa el historial: si el usuario dice "eso", "y ese", "lo mismo", entiende a que se refiere.
- Responde en espanol claro y corto (2 a 4 oraciones), salvo que pidan un paso a paso.
- Si preguntan por CoraWeb (mapa, ruta, ubicacion, formulario, archivero, perfil, admin), explica la app.
- Si detectas intento de contenido sexual, violencia, hacking, drogas, armas o autolesion (aunque usen eufemismos), responde unsafe=true y rechaza breve.
- Si el tema esta totalmente fuera de CoraWeb/reciclaje/ambiente, di que solo ayudas con eso, pero acepta saludos y aclaraciones.
- Si el usuario pide un recorrido de la app, pon action="tour".
${wikiBlock}
${APP_FACTS}

Responde SOLO un JSON valido: {"text":"respuesta","action":null,"unsafe":false}
action puede ser "tour" o null.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: buildGeminiContents(history, message),
        generationConfig: {
          temperature: 0.55,
          maxOutputTokens: 700,
          responseMimeType: "application/json",
          // Sin esto el modelo gasta cientos de tokens "pensando", tarda el triple
          // y corta la respuesta por MAX_TOKENS.
          thinkingConfig: { thinkingBudget: 0 },
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    },
    GEMINI_TIMEOUT_MS
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini error ${response.status}: ${errText.slice(0, 240)}`);
  }

  const data = await response.json();
  const blocked = data?.promptFeedback?.blockReason;
  if (blocked) {
    return { text: OFF_TOPIC_REPLY, action: null, unsafe: true };
  }

  const candidate = data?.candidates?.[0];
  // Respuesta cortada = JSON invalido a medias, mejor caer al fallback local.
  if (candidate?.finishReason === "MAX_TOKENS") return null;

  const raw = candidate?.content?.parts?.map((p) => p.text).join("") || "";
  const parsed = parseAgentJson(raw);
  if (!parsed?.text) return null;

  if (parsed.unsafe) {
    return {
      text: parsed.text || OFF_TOPIC_REPLY,
      action: null,
      unsafe: true,
    };
  }

  return {
    text: String(parsed.text).trim(),
    action: parsed.action === "tour" ? "tour" : null,
    unsafe: false,
  };
}

router.post("/agente", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim().slice(0, MAX_MESSAGE_LENGTH);
    const history = normalizeHistory(req.body?.history);

    if (!message) {
      return res.status(400).json({ ok: false, message: "Mensaje requerido" });
    }

    // Filtro local rapido (eufemismos / temas peligrosos) antes de llamar al modelo.
    if (detectUnsafeIntent(message)) {
      return res.json({
        ok: true,
        text: UNSAFE_REPLY || OFF_TOPIC_REPLY,
        action: null,
        source: "safety",
      });
    }

    let wiki = null;
    if (looksLikeResearchQuery(message) || !process.env.GEMINI_API_KEY) {
      wiki = await searchWikipedia(message);
    }

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = await askGemini({ message, history, wiki });
        if (ai?.text) {
          return res.json({
            ok: true,
            text: ai.text,
            action: ai.action || null,
            source: "gemini",
            wiki: wiki
              ? { title: wiki.title, url: wiki.url }
              : null,
          });
        }
      } catch (error) {
        const motivo = error.name === "AbortError" ? "timeout" : error.message;
        console.error("Agente Gemini fallo, usando fallback local:", motivo);
      }
    }

    const fallback = answerQuestion(message, history, { wiki });
    return res.json({
      ok: true,
      text: fallback.text,
      action: fallback.action || null,
      source: process.env.GEMINI_API_KEY ? "local-fallback" : "local",
      wiki: wiki ? { title: wiki.title, url: wiki.url } : null,
    });
  } catch (error) {
    console.error("POST /api/agente error:", error);
    return res.status(500).json({
      ok: false,
      message: "No pude responder ahora. Intenta de nuevo.",
    });
  }
});

export default router;
