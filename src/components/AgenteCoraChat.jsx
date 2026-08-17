/**
 * AgenteCoraChat.jsx — burbuja flotante (esquina inferior derecha).
 *
 * No llama a una IA en la nube. Cada mensaje pasa por answerQuestion()
 * en src/agent/agenteCora.js (palabras clave y reglas fijas).
 *
 * Si la respuesta trae action: "tour", se cierra el chat y se dispara
 * el evento "cora-start-tour" para que CoraTour recorra la interfaz.
 *
 * memo() evita re-renders cuando el padre (Layout) se actualiza.
 */
import { useEffect, useRef, useState, useCallback, memo } from "react";
import { answerQuestion, CONVERSATION_STARTERS } from "../agent/agenteCora";
import coraLogo from "../assets/img/Cora-Agent.png";
import "../assets/styles/AgenteCora.css";

const WELCOME = {
  from: "bot",
  text: "Hola, soy AgenteCora. Te ayudo con reciclaje, clasificacion de residuos, niveles de riesgo y el uso de CoraWeb. En que te puedo ayudar?",
};

function AgenteCoraChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  // Al abrir o al llegar un mensaje, baja el scroll al último globo.
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = (rawText) => {
    const text = (rawText ?? input).trim();
    if (!text) return;
    const reply = answerQuestion(text);
    setMessages((prev) => [...prev, { from: "user", text }, { from: "bot", text: reply.text }]);
    setInput("");
    if (reply.action === "tour") {
      setOpen(false);
      setTimeout(() => window.dispatchEvent(new CustomEvent("cora-start-tour")), 300);
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
              <span>Asistente de CoraWeb</span>
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

            {/* Sugerencias solo mientras no hay conversación (solo el saludo). */}
            {messages.length === 1 && (
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
            />
            <button type="submit" aria-label="Enviar">
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
