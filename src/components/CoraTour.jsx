import { useEffect, useLayoutEffect, useState } from "react";
import "../assets/styles/CoraTour.css";

const STEPS = [
  {
    selector: '[data-tour="location"]',
    title: "Activa tu ubicacion",
    text: "Toca este boton y el mapa te lleva a tu posicion actual para ubicarte facil.",
  },
  {
    selector: '[data-tour="register"]',
    title: "Registra un punto",
    text: "Activa este modo y luego haz clic en el mapa, justo donde estan los residuos.",
  },
  {
    selector: null,
    title: "Llena el formulario",
    text: "Al hacer clic en el mapa aparece un formulario: nombre, tipo de residuo, cantidad, pendiente, cercania al agua y mas. Cuando lo guardas, calculo el nivel de riesgo y lo veras con su color al lado del punto.",
  },
  {
    selector: '[data-tour="footer"]',
    title: "Menu de navegacion",
    text: "Desde aqui te mueves entre el Mapa (Home), el Archivero con los puntos y sus riesgos, la Web informativa y tu Perfil.",
  },
];

function CoraTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);

  useEffect(() => {
    const start = () => {
      setStep(0);
      setActive(true);
    };
    window.addEventListener("cora-start-tour", start);
    return () => window.removeEventListener("cora-start-tour", start);
  }, []);

  useLayoutEffect(() => {
    if (!active) return;
    const measure = () => {
      const sel = STEPS[step].selector;
      const el = sel ? document.querySelector(sel) : null;
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, step]);

  if (!active) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const pad = 8;

  const spotStyle = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  let tipStyle;
  if (rect) {
    const below = rect.bottom + 14;
    const placeBelow = below + 160 < window.innerHeight;
    tipStyle = {
      top: placeBelow ? below : Math.max(14, rect.top - 14 - 160),
      left: Math.min(Math.max(14, rect.left), window.innerWidth - 314),
    };
  } else {
    tipStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  const close = () => setActive(false);
  const next = () => (isLast ? close() : setStep((s) => s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="cora-tour">
      {spotStyle ? (
        <div className="cora-tour-spotlight" style={spotStyle} />
      ) : (
        <div className="cora-tour-dim" />
      )}

      <div className="cora-tour-tip" style={tipStyle}>
        <button type="button" className="cora-tour-x" onClick={close} aria-label="Cerrar tutorial">
          &times;
        </button>
        <strong className="cora-tour-title">{current.title}</strong>
        <p className="cora-tour-text">{current.text}</p>
        <div className="cora-tour-footer">
          <span className="cora-tour-count">
            {step + 1} / {STEPS.length}
          </span>
          <div className="cora-tour-actions">
            {step > 0 && (
              <button type="button" className="cora-tour-btn ghost" onClick={prev}>
                Atras
              </button>
            )}
            <button type="button" className="cora-tour-btn" onClick={next}>
              {isLast ? "Listo" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CoraTour;