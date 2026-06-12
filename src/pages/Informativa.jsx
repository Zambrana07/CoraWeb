import { memo, useCallback, useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { initGallery } from "../components/informativaGallery";
import "../assets/styles/Informativa.css";

const img = (keyword, lock) => `https://loremflickr.com/600/900/${keyword}?lock=${lock}`;

const TOPICS = [
  {
    id: "reciclaje",
    title: "Reciclaje",
    image: img("recycling", 11),
    text: "Reciclar es devolver al ciclo productivo materiales que ya usamos. Separar bien en casa es el primer paso para que CoraWeb y la comunidad puedan gestionarlos.",
    tips: [
      "Separa por material: organico, papel, plastico, vidrio y metal.",
      "Manten cada grupo limpio y seco.",
      "Reduce y reutiliza antes de reciclar.",
    ],
  },
  {
    id: "plastico",
    title: "Plastico",
    image: img("plastic,bottle", 12),
    text: "El plastico tarda cientos de anos en degradarse y se convierte en microplasticos que llegan al agua. Manejarlo bien evita gran parte de la contaminacion.",
    tips: [
      "Enjuaga, seca y aplasta los envases.",
      "Evita que llegue a rios y quebradas.",
      "Prefiere envases reutilizables.",
    ],
  },
  {
    id: "organico",
    title: "Organico y compost",
    image: img("compost", 15),
    text: "Los restos de comida y hojas pueden transformarse en abono. Compostar reduce la basura y nutre el suelo.",
    tips: [
      "Separa los organicos de los reciclables.",
      "Composta restos de fruta, verdura y hojas.",
      "Evita carne y lacteos en el compost casero.",
    ],
  },
  {
    id: "baterias",
    title: "Baterias y pilas",
    image: img("battery", 17),
    text: "Las pilas y baterias contienen metales que contaminan suelo y agua. Nunca van a la basura comun.",
    tips: [
      "Guardalas secas en un frasco aparte.",
      "Llevalas a un punto de residuos especiales.",
      "Nunca las quemes ni las perfores.",
    ],
  },
  {
    id: "agua",
    title: "Cuidado del agua",
    image: img("river,water", 20),
    text: "Los residuos cerca de rios y quebradas generan lixiviados que contaminan el agua. Esos puntos tienen prioridad de retiro.",
    tips: [
      "Reporta residuos cercanos al agua en el mapa.",
      "Usa barreras de contencion cuando sea posible.",
      "Retira con prioridad los puntos cercanos al agua.",
    ],
  },
  {
    id: "comunidad",
    title: "Comunidad Cora",
    image: img("volunteer,cleanup", 22),
    text: "CoraWeb es comunidad: cada punto reportado ayuda a todos. Juntos mapeamos y limpiamos los residuos del entorno.",
    tips: [
      "Registra puntos de residuos en el mapa.",
      "Comenta y verifica reportes en el Archivero.",
      "Comparte buenas practicas con tu comunidad.",
    ],
  },
];

const RISK_COLORS = [
  {
    id: "verde",
    color: "#2e7d32",
    nivel: "Verde - Riesgo bajo",
    text: "Se puede postergar. El punto se maneja con recoleccion y separacion normal, sin urgencia.",
  },
  {
    id: "amarillo",
    color: "#c9a227",
    nivel: "Amarillo - Riesgo moderado",
    text: "Atiendelo pronto. Conviene retirar los residuos con precaucion antes de que el problema crezca.",
  },
  {
    id: "rojo",
    color: "#c62828",
    nivel: "Rojo - Riesgo alto",
    text: "Atencion prioritaria. Maneja con cuidado, usa proteccion y reportalo de inmediato a la cuadrilla.",
  },
];

const Gallery = memo(function Gallery({ topics, onOpen }) {
  const ref = useRef(null);

  useEffect(() => {
    const cleanup = initGallery(ref.current, { onOpen });
    return cleanup;
  }, [onOpen]);

  return (
    <div className="wrapper">
      <div className="items" id="gallery" ref={ref}>
        {topics.map((topic) => (
          <div
            className="item"
            key={topic.id}
            tabIndex={0}
            role="button"
            aria-label={topic.title}
            style={{ backgroundImage: `url(${topic.image})` }}
          >
            <span className="item-caption">{topic.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

function Informativa() {
  const [openIndex, setOpenIndex] = useState(-1);

  const handleOpen = useCallback((index) => {
    setOpenIndex(index);
  }, []);

  const active = openIndex >= 0 ? TOPICS[openIndex] : null;

  return (
    <div className="informativa-page page-transition">
      <Header />
      <div className="informativa-content">
        <div className="informativa-intro">
          <h1 className="nature-title">Web informativa</h1>
          <p>
            Explora la galeria y haz clic en cualquier tarjeta para ver informacion
            sobre ese tema de reciclaje y gestion de residuos.
          </p>
        </div>

        <Gallery topics={TOPICS} onOpen={handleOpen} />

        <section className="informativa-detail">
          {active ? (
            <>
              <span className="informativa-detail-tag">{active.title}</span>
              <h2 className="nature-title">{active.title}</h2>
              <p className="informativa-detail-text">{active.text}</p>
              <ul className="informativa-detail-tips">
                {active.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="informativa-detail-hint">
              Haz clic en una tarjeta de la galeria para ver su informacion aqui.
            </p>
          )}
        </section>

        <section className="informativa-legend">
          <h2 className="informativa-legend-title nature-title">Que significa cada color?</h2>
          <p className="informativa-legend-intro">
            Cuando registras un punto en el mapa, AgenteCora analiza el formulario y le asigna
            un color segun su nivel de riesgo. Asi sabes que tan urgente es atenderlo.
          </p>
          <div className="informativa-legend-cards">
            {RISK_COLORS.map((risk) => (
              <article
                className="informativa-legend-card"
                key={risk.id}
                style={{ "--legend-color": risk.color }}
              >
                <span className="informativa-legend-dot" />
                <h3>{risk.nivel}</h3>
                <p>{risk.text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}

export default Informativa;
