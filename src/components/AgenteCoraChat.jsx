import { useEffect, useRef, useState, memo } from "react";
import { CONVERSATION_STARTERS } from "../agent/agenteCora";
import coraLogo from "../assets/img/Cora-Agent.png";
import "../assets/styles/AgenteCora.css";

// Corte de seguridad: el backend tarda como maximo ~13s, si pasa de esto algo se colgo.
const REQUEST_TIMEOUT_MS = 20000;

const WELCOME = {
  from: "bot",
  text: "Hola, soy AgenteCora. Te ayudo con reciclaje, clasificacion de residuos, niveles de riesgo y el uso de CoraWeb. Tambien puedo buscar info ambiental confiable cuando la necesites. En que te ayudo?",
};

function AgenteCoraChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  const send = async (rawText) => {
    const text = (rawText ?? input).trim();
    if (!text || loading) return;

    const history = messages
      .filter((m) => m.from === "user" || m.from === "bot")
      .slice(-10)
      .map((m) => ({ from: m.from, text: m.text }));

    setMessages((prev) => [...prev, { from: "user", text }]);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
        signal: controller.signal,
      });
      const data = await response.json();

      const replyText =
        data?.text ||
        data?.message ||
        "No pude responder ahora. Intenta de nuevo en un momento.";

      setMessages((prev) => [...prev, { from: "bot", text: replyText }]);

      if (data?.action === "tour") {
        setOpen(false);
        setTimeout(() => window.dispatchEvent(new CustomEvent("cora-start-tour")), 300);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text:
            error?.name === "AbortError"
              ? "Me tarde demasiado en responder. Intentalo de nuevo con una pregunta mas corta."
              : "Tuve un problema de conexion. Revisa que el backend este corriendo e intentalo otra vez.",
        },
      ]);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send();
  };

  return (
    <div className="cora-chat-root">
      {open && (
        <div className="cora-chat-panel" role="dialog" aria-label="Chat con AgenteCora">
          <div className="cora-chat-header">
            <div className="cora-chat-avatar">AC</div>
            <div className="cora-chat-titles">
              <strong>AgenteCora</strong>
              <span>Asistente inteligente de CoraWeb</span>
            </div>
            <button
              type="button"
              className="cora-chat-close"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
            >
              &times;
            </button>
          </div>

          <div className="cora-chat-body">
            {messages.map((m, i) => (
              <div key={i} className={`cora-msg cora-msg-${m.from}`}>
                {m.text}
              </div>
            ))}

            {loading && (
              <div className="cora-msg cora-msg-bot cora-msg-typing">
                AgenteCora esta pensando...
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div className="cora-starters">
                {CONVERSATION_STARTERS.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    className="cora-starter"
                    onClick={() => send(s.text)}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className="cora-chat-input" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta..."
              disabled={loading}
            />
            <button type="submit" aria-label="Enviar" disabled={loading || !input.trim()}>
              &#10148;
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="cora-chat-bubble"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar AgenteCora" : "Abrir AgenteCora"}
      >
        {open ? "\u2715" : <img src={coraLogo} alt="AgenteCora" />}
      </button>
    </div>
  );
}

export default memo(AgenteCoraChat);
