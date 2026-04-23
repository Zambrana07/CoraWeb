import Header from "../components/Header";
import Footer from "../components/Footer";
import "../styles/ArchiveroPage.css";

function ArchiveroPage() {
  return (
    <div className="app">
      <Header />
      <div className="archivero-page-content">
        <h1 className="archivero-page-title" contentEditable suppressContentEditableWarning>
          Titulo del Archivero
        </h1>
        <div className="archivero-carousel-base">
          <button className="archivero-carousel-btn" type="button" aria-label="Anterior">
            {"<"}
          </button>
          <div className="archivero-carousel-track">
            <div className="archivero-carousel-item">Slide 1</div>
            <div className="archivero-carousel-item">Slide 2</div>
            <div className="archivero-carousel-item">Slide 3</div>
          </div>
          <button className="archivero-carousel-btn" type="button" aria-label="Siguiente">
            {">"}
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default ArchiveroPage;
