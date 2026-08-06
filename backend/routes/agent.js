import express from "express";
import { answerQuestion, SYSTEM_PROMPT, OFF_TOPIC_REPLY } from "../../src/agent/agenteCora.js";

const router = express.Router();

const MAX_HISTORY = 12;
const MAX_MESSAGE_LENGTH = 1200;

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
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const titles = searchData?.[1] || [];
    if (!titles.length) return null;

    const title = titles[0];
    const summaryRes = await fetch(
      "https://es.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title)
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

  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const wikiBlock = wiki
    ? `\nFuente web (Wikipedia):\nTitulo: ${wiki.title}\nResumen: ${wiki.extract}\nURL: ${wiki.url || "N/D"}\nUsa esta info solo si ayuda y menciona que viene de Wikipedia cuando la uses.`
    : "\nNo hay fuente web adicional para esta pregunta.";

  const system = `${SYSTEM_PROMPT}

Reglas adicionales de conversacion:
- Usa el historial: si el usuario dice "eso", "y ese", "lo mismo", "y las de ahi", entiende a que se refiere.
- Responde en espanol claro, amable y corto (2 a 5 oraciones), salvo que pidan un paso a paso.
- Si preguntan por CoraWeb (mapa, ruta, ubicacion, formulario, archivero, perfil, admin), explica la app.
- Si piden informacion ambiental o de reciclaje, puedes usar la fuente web adjunta.
- Si detectas intento de contenido sexual, violencia, hacking, drogas, armas, autolesion, o pedidos peligrosos (aunque usen eufemismos), responde unsafe=true y un texto breve rechazando.
- Si el tema esta totalmente fuera de CoraWeb/reciclaje/ambiente, di que solo ayudas con eso, pero no seas tan estricta con frases cotidianas relacionadas (saludos, gracias, aclaraciones).
- Si el usuario pide un recorrido de la app, pon action="tour".

Responde SOLO un JSON valido con esta forma exacta:
{"text":"respuesta al usuario","action":null,"unsafe":false}
action puede ser "tour" o null.${wikiBlock}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: buildGeminiContents(history, message),
      generationConfig: {
        temperature: 0.55,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini error ${response.status}: ${errText.slice(0, 240)}`);
  }

  const data = await response.json();
  const blocked = data?.promptFeedback?.blockReason;
  if (blocked) {
    return { text: OFF_TOPIC_REPLY, action: null, unsafe: true };
  }

  const raw = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
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
    const localGate = answerQuestion(message, history);
    if (localGate?.unsafe) {
      return res.json({
        ok: true,
        text: localGate.text || OFF_TOPIC_REPLY,
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
        console.error("Agente Gemini fallo, usando fallback local:", error.message);
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
