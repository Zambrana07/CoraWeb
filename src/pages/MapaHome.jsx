import MyMapComponent from '../components/myMapComponent';
import '../assets/styles/MapaHome.css';
import Header from "../components/Header";
import Footer from "../components/Footer";
import ArchiveroPage from "./ArchiveroPage";
import Perfil from "./perfil";

function App() {
    const currentPath = window.location.pathname.toLowerCase();

    if (currentPath === '/archivero') {
        return <ArchiveroPage />;
    }
    if (currentPath === '/perfil') {
        return <Perfil />;
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