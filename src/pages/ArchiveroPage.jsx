import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import logo from "../assets/CoraLogo.png";
import basura1 from "../assets/basura1.jpg";
import basura2 from "../assets/basura2.jpg";
import basura3 from "../assets/basura3.webp";
import "./ArchiveroPage.css";

const imagePool = [basura1, basura2, basura3];
const allowedRegions = ["Colegio CTP CIT", "Soda armonia"];

const allPoints = [
  { id: 1, name: "Punto Central", image: logo, region: "Colegio CTP CIT" },
  { id: 2, name: "Punto Norte", image: basura1, region: "Colegio CTP CIT" },
  { id: 3, name: "Punto Sur", image: basura2, region: "Soda armonia" },
  { id: 4, name: "Punto Este", image: basura3, region: "Colegio CTP CIT" },
  { id: 5, name: "Punto Oeste", image: basura2, region: "Soda armonia" },
  { id: 6, name: "Punto Plaza", image: basura1, region: "Soda armonia" },
  { id: 7, name: "Punto Parque", image: basura3, region: "Colegio CTP CIT" },
  { id: 8, name: "Punto Colegio", image: basura1, region: "Soda armonia" },
  { id: 9, name: "Punto Mercado", image: basura2, region: "Soda armonia" },
];

const carouselSections = ["Carrusel principal", "Puntos frecuentes", "Agregados recientemente"];
const regionOptions = allowedRegions;
const storageKey = "archiveroPoints";
const getItemsPerView = () => {
  if (window.innerWidth <= 640) {
    return 1;
  }
  if (window.innerWidth <= 900) {
    return 2;
  }
  return 3;
};

function ArchiveroPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [itemsPerView, setItemsPerView] = useState(getItemsPerView);
  const [carouselIndexes, setCarouselIndexes] = useState(() =>
    Object.fromEntries(carouselSections.map((sectionTitle) => [sectionTitle, 0])),
  );
  const [savedPoints] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map((point) => ({
        id: point.id,
        name: point.name,
        region: allowedRegions.includes(point.region) ? point.region : "Colegio CTP CIT",
        image: imagePool[Math.abs(Number(point.id) || 0) % imagePool.length],
      }));
    } catch {
      return [];
    }
  });

  const mergedPoints = useMemo(() => [...savedPoints, ...allPoints], [savedPoints]);

  const filteredPoints = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    return mergedPoints.filter((point) => {
      const matchesSearch = !normalizedTerm || point.name.toLowerCase().includes(normalizedTerm);
      const matchesRegion = selectedRegion === "all" || point.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [searchTerm, selectedRegion, mergedPoints]);

  useEffect(() => {
    const handleResize = () => setItemsPerView(getItemsPerView());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const maxStartIndex = Math.max(0, filteredPoints.length - itemsPerView);
    setCarouselIndexes((current) =>
      Object.fromEntries(
        carouselSections.map((sectionTitle) => [sectionTitle, Math.min(current[sectionTitle] || 0, maxStartIndex)]),
      ),
    );
  }, [filteredPoints.length, itemsPerView]);

  const maxStartIndex = Math.max(0, filteredPoints.length - itemsPerView);
  const moveCarousel = (sectionTitle, direction) => {
    setCarouselIndexes((current) => {
      const currentIndex = current[sectionTitle] || 0;
      const nextIndex = Math.min(maxStartIndex, Math.max(0, currentIndex + direction));
      return { ...current, [sectionTitle]: nextIndex };
    });
  };

  return (
    <div className="archivero-page">
      <Header />
      <div className="archivero-page-content">
        <div className="archivero-search-wrap">
          <input
            className="archivero-search"
            type="search"
            placeholder="Buscar punto..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            className="archivero-region-filter"
            value={selectedRegion}
            onChange={(event) => setSelectedRegion(event.target.value)}
          >
            <option value="all">Todas las regiones</option>
            {regionOptions.map((region) => (
              <option value={region} key={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        <h1 className="archivero-page-title" contentEditable suppressContentEditableWarning>
          Archivero-Cora
        </h1>

        {carouselSections.map((sectionTitle) => (
          <section className="archivero-section" key={sectionTitle}>
            <h2 className="archivero-section-title">{sectionTitle}</h2>
            <div className="archivero-carousel-base">
              <button
                className="archivero-carousel-btn"
                type="button"
                aria-label="Anterior"
                onClick={() => moveCarousel(sectionTitle, -1)}
                disabled={carouselIndexes[sectionTitle] === 0}
              >
                {"<"}
              </button>
              <div className="archivero-carousel-track">
                <div
                  className="archivero-carousel-slider"
                  style={{
                    transform: `translateX(-${(carouselIndexes[sectionTitle] * 100) / itemsPerView}%)`,
                    "--items-per-view": itemsPerView,
                  }}
                >
                  {filteredPoints.map((point) => (
                    <div className="archivero-carousel-item" key={`${sectionTitle}-${point.id}`}>
                      <img className="archivero-carousel-image" src={point.image} alt={point.name} />
                      <span>{point.name}</span>
                      <small className="archivero-item-region">{point.region}</small>
                    </div>
                  ))}
                </div>
              </div>
              <button
                className="archivero-carousel-btn"
                type="button"
                aria-label="Siguiente"
                onClick={() => moveCarousel(sectionTitle, 1)}
                disabled={carouselIndexes[sectionTitle] >= maxStartIndex}
              >
                {">"}
              </button>
            </div>
          </section>
        ))}

        <h2 className="archivero-all-title">Todos los puntos</h2>
        <div className="archivero-list">
          {filteredPoints.map((point) => (
            <div className="archivero-list-item" key={point.id}>
              <img className="archivero-list-image" src={point.image} alt={point.name} />
              <div className="archivero-list-text">
                <span className="archivero-list-name">{point.name}</span>
                <small className="archivero-item-region">{point.region}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default ArchiveroPage;
