import { useMemo, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import logo from "../assets/CoraLogo.png";
import basura from "../assets/basura.jpg";
import "./ArchiveroPage.css";

const allPoints = [
  { id: 1, name: "Punto Central", image: logo, region: "Colegio CTP CIT" },
  { id: 2, name: "Punto Norte", image: basura, region: "New hope" },
  { id: 3, name: "Punto Sur", image: basura, region: "Soda armonia" },
  { id: 4, name: "Punto Este", image: basura, region: "Colegio CTP CIT" },
  { id: 5, name: "Punto Oeste", image: basura, region: "New hope" },
  { id: 6, name: "Punto Plaza", image: basura, region: "Soda armonia" },
  { id: 7, name: "Punto Parque", image: basura, region: "Colegio CTP CIT" },
  { id: 8, name: "Punto Colegio", image: basura, region: "New hope" },
  { id: 9, name: "Punto Mercado", image: basura, region: "Soda armonia" },
];

const carouselSections = ["Carrusel principal", "Puntos frecuentes", "Agregados recientemente"];
const regionOptions = ["Colegio CTP CIT", "Soda armonia"];
const storageKey = "archiveroPoints";

function ArchiveroPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");
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
        region: point.region || "Colegio CTP CIT",
        image: basura,
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
              <button className="archivero-carousel-btn" type="button" aria-label="Anterior">
                {"<"}
              </button>
              <div className="archivero-carousel-track">
                {filteredPoints.slice(0, 3).map((point) => (
                  <div className="archivero-carousel-item" key={`${sectionTitle}-${point.id}`}>
                    <img className="archivero-carousel-image" src={point.image} alt={point.name} />
                    <span>{point.name}</span>
                    <small className="archivero-item-region">{point.region}</small>
                  </div>
                ))}
              </div>
              <button className="archivero-carousel-btn" type="button" aria-label="Siguiente">
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
