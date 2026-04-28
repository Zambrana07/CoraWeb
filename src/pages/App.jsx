import MyMapComponent from '../components/myMapComponent';
import '../styles/App.css';
import Header from "../components/Header";
import Footer from "../components/Footer";
import ArchiveroPage from "./ArchiveroPage";

function App() {
    const currentPath = window.location.pathname.toLowerCase();

    if (currentPath === '/archivero') {
        return <ArchiveroPage />;
    }

    return (
        <div className="app">
            <Header />
            <div className="map-container"> 
                <MyMapComponent />
            </div>
            <Footer /> 
        </div>
    );
}

export default App;